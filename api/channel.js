import { NeynarAPIClient } from '@neynar/nodejs-sdk';

// Initialiser Neynar
const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

// Fonction pour calculer le Trust Rank
function calculateTrustRank(ethosScore, likes, recasts) {
    const social = Math.log(1 + likes + recasts);
    return 0.75 * ethosScore + 0.25 * (social * 20);
}

// Fonction pour obtenir l'Ethos Score (mock pour l'instant)
async function getEthosScore(address) {
    // Mock basé sur le hash de l'adresse
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 20 + (hash % 76); // Score entre 20 et 95
    
    // Pour utiliser la vraie API Ethos plus tard, remplace par :
    /*
    try {
        const response = await fetch(`https://api.ethos.network/score/${address}`);
        const data = await response.json();
        return data.score || 50;
    } catch (error) {
        console.error('Ethos API error:', error);
        return 50;
    }
    */
}

// Fonction pour obtenir l'adresse vérifiée
function getVerifiedAddress(author) {
    // Priorité à l'adresse vérifiée
    if (author.verified_addresses?.eth_addresses?.length > 0) {
        return author.verified_addresses.eth_addresses[0];
    }
    // Fallback sur custody address
    return author.custody_address;
}

export default async function handler(req, res) {
    try {
        const { channel = 'ethos', limit = 25 } = req.query;

        console.log(`Fetching channel: ${channel}, limit: ${limit}`);

        // Appeler l'API Neynar
        const response = await neynar.fetchFeedByChannelIds([channel], {
            limit: parseInt(limit),
            withRecasts: false,
        });

        console.log(`Received ${response.casts.length} casts from Neynar`);

        // Enrichir chaque cast avec Ethos Score
        const enrichedCasts = await Promise.all(
            response.casts.map(async (cast) => {
                const walletAddress = getVerifiedAddress(cast.author);
                const ethosScore = await getEthosScore(walletAddress);
                const trustRank = calculateTrustRank(
                    ethosScore,
                    cast.reactions?.likes_count || 0,
                    cast.reactions?.recasts_count || 0
                );

                return {
                    hash: cast.hash,
                    text: cast.text,
                    author: {
                        username: cast.author.username,
                        displayName: cast.author.display_name || cast.author.username,
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

        console.log(`Returning ${enrichedCasts.length} enriched casts`);

        res.status(200).json({
            success: true,
            channel,
            casts: enrichedCasts,
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch channel feed',
        });
    }
}
