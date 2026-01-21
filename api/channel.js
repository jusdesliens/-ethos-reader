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

        // Récupérer les infos des utilisateurs
        const fids = [...new Set(data.messages.map(m => m.data.fid))];
        const userInfos = await getUserInfos(fids, jwt);

        const casts = data.messages
            .filter(msg => msg.data?.castAddBody?.text) // Filtrer les casts vides
            .map(msg => {
                const cast = msg.data.castAddBody;
                const fid = msg.data.fid;
                const userInfo = userInfos[fid] || {};
                
                const walletAddress = userInfo.verifications?.[0] || 
                                    userInfo.custodyAddress || 
                                    `0x${fid.toString(16).padStart(40, '0')}`;
                const ethosScore = getEthosScore(walletAddress);
                
                const likes = Math.floor(Math.random() * 100);
                const recasts = Math.floor(Math.random() * 30);
                const trustRank = calculateTrustRank(ethosScore, likes, recasts);

                return {
