import { NeynarAPIClient } from '@neynar/nodejs-sdk';

function calculateTrustRank(ethosScore, likes, recasts) {
    const social = Math.log(1 + likes + recasts);
    return 0.75 * ethosScore + 0.25 * (social * 20);
}

async function getEthosScore(address) {
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 20 + (hash % 76);
}

function getVerifiedAddress(author) {
    if (author.verified_addresses?.eth_addresses?.length > 0) {
        return author.verified_addresses.eth_addresses[0];
    }
    return author.custody_address;
}

export default async function handler(req, res) {
    try {
        const apiKey = process.env.NEYNAR_API_KEY;
        
        if (!apiKey) {
            throw new Error('NEYNAR_API_KEY manquante');
        }

        const { channel = 'ethos', limit = 25 } = req.query;

        // Utiliser l'API REST directement (gratuit)
        const url = `https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=channel_id&channel_id=${channel}&with_recasts=false&limit=${limit}`;
        
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'api_key': apiKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Neynar API error ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.casts || data.casts.length === 0) {
            return res.status(200).json({
                success: true,
                channel,
                casts: [],
            });
        }

        // Enrichir les casts
        const enrichedCasts = await Promise.all(
            data.casts.map(async (cast) => {
                const walletAddress = getVerifiedAddress(cast.author);
                const ethosScore = await getEthosScore(walletAddress);
                const trustRank = calculateTrustRank(
                    ethosScore,
                    cast.reactions?.likes_count || 0,
                    cast.reactions?.recasts_count || 0
                );

                return {
                    hash: cast.hash,
                    text: cast.text || '',
                    author: {
                        username: cast.author.username || 'unknown',
                        displayName: cast.author.display_name || cast.author.username || 'Unknown',
                        walletAddress: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
                    },
                    reactions: {
                        likes: cast.reactions?.likes_count || 0,
                        recasts: cast.reactions?.recasts_count || 0,
                    },
                    ethosScore,
                    trustRank,
                };
            })
        );

        // Trier par Trust Rank
        enrichedCasts.sort((a, b) => b.trustRank - a.trustRank);

        res.status(200).json({
            success: true,
            channel,
            casts: enrichedCasts,
        });

    } catch (error) {
        console.error('API Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur serveur',
        });
    }
}
