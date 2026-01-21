module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const channel = req.query.channel || 'ethos';
        const limit = req.query.limit || 25;
        const jwt = process.env.PINATA_JWT;
        
        if (!jwt) {
            throw new Error('PINATA_JWT not configured');
        }
        
        console.log('Fetching channel:', channel);
        
        const url = 'https://hub.pinata.cloud/v1/castsByParent?url=https://warpcast.com/~/channel/' + channel + '&limit=' + limit;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'authorization': 'Bearer ' + jwt
            }
        });

        if (!response.ok) {
            throw new Error('Pinata API error: ' + response.status);
        }

        const data = await response.json();
        
        if (!data.messages || data.messages.length === 0) {
            return res.status(200).json({
                success: true,
                channel: channel,
                casts: []
            });
        }

        const casts = data.messages
            .filter(function(msg) {
                return msg.data && msg.data.castAddBody && msg.data.castAddBody.text;
            })
            .map(function(msg) {
                const cast = msg.data.castAddBody;
                const fid = msg.data.fid;
                const walletAddress = '0x' + fid.toString(16).padStart(40, '0');
                const ethosScore = getEthosScore(walletAddress);
                const likes = Math.floor(Math.random() * 100);
                const recasts = Math.floor(Math.random() * 30);
                const trustRank = calculateTrustRank(ethosScore, likes, recasts);

                return {
                    hash: '0x' + msg.hash,
                    text: cast.text,
                    author: {
                        username: 'user' + fid,
                        displayName: 'User ' + fid,
                        walletAddress: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)
                    },
                    reactions: {
                        likes: likes,
                        recasts: recasts
                    },
                    ethosScore: ethosScore,
                    trustRank: trustRank
                };
            });

        casts.sort(function(a, b) {
            return b.trustRank - a.trustRank;
        });

        res.status(200).json({
            success: true,
            channel: channel,
            casts: casts
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

function getEthosScore(address) {
    const hash = address.split('').reduce(function(acc, char) {
        return acc + char.charCodeAt(0);
    }, 0);
    return 20 + (hash % 76);
}

function calculateTrustRank(ethosScore, likes, recasts) {
    const social = Math.log(1 + likes + recasts);
    return 0.75 * ethosScore + 0.25 * (social * 20);
}
