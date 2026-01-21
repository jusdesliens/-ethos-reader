module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const { channel = 'ethos', limit = 25 } = req.query;
        const jwt = process.env.PINATA_JWT;
        
        if (!jwt) {
            throw new Error('PINATA_JWT not configured');
        }
        
        console.log(`[API] Fetching channel: ${channel}`);
        
        const url = `https://hub.pinata.cloud/v1/castsByParent?url=https://warpcast.com/~/channel/${channel}&limit=${limit}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${jwt}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API] Pinata error:', response.status, errorText);
            throw new Error(`Pinata API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.messages || data.messages.length === 0) {
            return res.status(200).json({
                success: true,
                channel,
                casts: [],
            });
        }

        const casts = data.messages.map(msg => {
            const cast = msg.data.castAddBody;
            const fid = msg.data.fid;
            
            const walletAddress = `0x${fid.toString(16).padStart(40, '0')}`;
            const ethosScore = getEthosScore(walletAddress);
            
            const likes = Math.floor(Math.random() * 50);
            const recasts = Math.floor(Math.random() * 20);
            const trustRank = calculateTrustRank(ethosScore, likes, recasts);

            return {
                hash: `0x${msg.hash}`,
                text: cast.text || '',
                author: {
                    username: `user${fid}`,
                    displayName: `User ${fid}`,
                    walletAddress: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
                },
                reactions: { likes, recasts },
                ethosScore,
                trustRank,
            };
        });

        casts.sort((a, b) => b.trustRank - a.trustRank);

        res.status(200).json({
            success: true,
            channel,
            casts,
