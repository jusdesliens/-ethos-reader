export default async function handler(req, res) {
    try {
        const apiKey = process.env.NEYNAR_API_KEY;
        
        if (!apiKey) {
            throw new Error('NEYNAR_API_KEY manquante');
        }

        const { channel = 'ethos', limit = 25 } = req.query;

        console.log(`Fetching channel: ${channel}`);

        // Pour Mini App, utiliser l'endpoint cast search
        // qui est souvent accessible sur le plan gratuit
        const url = `https://api.neynar.com/v2/farcaster/cast/search?q=${channel}&limit=${limit}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': apiKey,
                'x-neynar-experimental': 'true'
            }
        });

        console.log('Response status:', response.status);

        if (response.status === 402) {
            console.log('402 Error - Trying alternative approach...');
            
            // Alternative : utiliser l'endpoint trending
            const trendingUrl = `https://api.neynar.com/v2/farcaster/feed/trending?limit=${limit}`;
            
            const trendingResponse = await fetch(trendingUrl, {
                headers: {
                    'accept': 'application/json',
                    'api_key': apiKey
                }
            });

            if (!trendingResponse.ok) {
                const errorData = await trendingResponse.json().catch(() => ({}));
                throw new Error(`Neynar API ${trendingResponse.status}: ${errorData.message || 'Access denied. Free plan may not include this endpoint.'}`);
            }

            const trendingData = await trendingResponse.json();
            return processAndReturnCasts(trendingData.casts, 'trending', res);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Neynar API ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        return processAndReturnCasts(data.casts, channel, res);

    } catch (error) {
        console.error('API Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

function processAndReturnCasts(casts, channel, res) {
    if (!casts || casts.length === 0) {
        return res.status(200).json({
            success: true,
            channel,
            casts: [],
        });
    }

    const enrichedCasts = casts.map(cast => {
        const walletAddress = getVerifiedAddress(cast.author);
        const ethosScore = getEthosScore(walletAddress);
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
    });

    enrichedCasts.sort((a, b) => b.trustRank - a.trustRank);

    res.status(200).json({
        success: true,
        channel,
        casts: enrichedCasts,
    });
}

function getVerifiedAddress(author) {
    if (author.verified_addresses?.eth_addresses?.length > 0) {
        return author.verified_addresses.eth_addresses[0];
    }
    return author.custody_address;
}

function getEthosScore(address) {
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 20 + (hash % 76);
}

function calculateTrustRank(ethosScore, likes, recasts) {
    const social = Math.log(1 + likes + recasts);
    return 0.75 * ethosScore + 0.25 * (social * 20);
}
