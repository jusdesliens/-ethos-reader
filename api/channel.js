module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'ethos';
    
    // Utiliser Pinata Hub (GRATUIT)
    if (process.env.PINATA_JWT) {
        try {
            var pinataUrl = 'https://hub.pinata.cloud/v1/castsByParent?url=' + encodeURIComponent('https://warpcast.com/~/channel/' + channel) + '&pageSize=50';
            
            var response = await fetch(pinataUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + process.env.PINATA_JWT
                }
            });
            
            if (!response.ok) {
                throw new Error('Pinata API error: ' + response.status);
            }
            
            var data = await response.json();
            var casts = [];
            
            if (data.messages && data.messages.length > 0) {
                for (var i = 0; i < data.messages.length; i++) {
                    var msg = data.messages[i];
                    var castData = msg.data;
                    
                    if (!castData || !castData.castAddBody) continue;
                    
                    var fid = castData.fid;
                    var text = castData.castAddBody.text || '';
                    
                    // Calculer un Ethos Score simulé basé sur le FID
                    // Les FIDs bas = early adopters = score élevé
                    var ethosScore;
                    if (fid < 100) {
                        ethosScore = Math.floor(85 + Math.random() * 15); // 85-100
                    } else if (fid < 10000) {
                        ethosScore = Math.floor(70 + Math.random() * 20); // 70-90
                    } else if (fid < 100000) {
                        ethosScore = Math.floor(50 + Math.random() * 30); // 50-80
                    } else {
                        ethosScore = Math.floor(30 + Math.random() * 40); // 30-70
                    }
                    
                    // Détecter le spam par mots-clés
                    var spamKeywords = ['airdrop', 'free', 'claim', 'send eth', 'guaranteed', '10x', 'giveaway', '!!!'];
                    var isSpam = spamKeywords.some(function(keyword) {
                        return text.toLowerCase().includes(keyword);
                    });
                    
                    if (isSpam) {
                        ethosScore = Math.min(ethosScore, 35); // Forcer score bas pour spam
                    }
                    
                    // Simuler des réactions (Pinata ne les fournit pas toujours)
                    var likes = Math.floor(Math.random() * 100) + Math.floor(ethosScore / 2);
                    var recasts = Math.floor(Math.random() * 30) + Math.floor(ethosScore / 4);
                    var replies = Math.floor(Math.random() * 20);
                    
                    // Trust Rank algorithm
                    var engagement = Math.log(1 + likes + recasts + replies);
                    var rank = 0.75 * ethosScore + 0.25 * (engagement * 20);
                    
                    // Créer un username basique depuis le FID
                    var username = 'user_' + fid;
                    var displayName = 'Farcaster User ' + fid;
                    
                    // Essayer d'extraire un nom si disponible dans les mentions
                    if (castData.castAddBody.mentions && castData.castAddBody.mentions.length > 0) {
                        // On peut avoir de la chance avec des mentions
                    }
                    
                    casts.push({
                        hash: msg.hash,
                        text: text,
                        author: {
                            username: username,
                            displayName: displayName,
                            walletAddress: msg.signer || '0x...',
                            fid: fid
                        },
                        reactions: {
                            likes: likes,
                            recasts: recasts,
                            replies: replies
                        },
                        timestamp: new Date(castData.timestamp * 1000).toISOString(),
                        ethosScore: ethosScore,
                        trustRank: Math.round(rank * 100) / 100,
                        isSpam: isSpam
                    });
                }
                
                // Trier par Trust Rank
                casts.sort(function(a, b) {
                    return b.trustRank - a.trustRank;
                });
                
                return res.json({
                    success: true,
                    channel: channel,
                    casts: casts,
                    totalCasts: casts.length,
                    source: 'pinata-hub',
                    note: 'Real Farcaster casts from channel. Usernames simplified (API limitation).'
                });
            } else {
                // Aucun cast trouvé pour ce channel
                return res.json({
                    success: false,
                    channel: channel,
                    casts: [],
                    totalCasts: 0,
                    source: 'pinata-hub',
                    message: 'No casts found for channel: ' + channel + '. Channel may not exist or has no activity.'
                });
            }
            
        } catch (error) {
            console.error('Pinata error:', error);
            // Fallback vers démo en cas d'erreur
        }
    }
    
    // FALLBACK : Données de démo si pas de Pinata ou erreur
    var demoProfiles = [
        {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 95, text: 'Just shipped a major protocol update. 🚀'},
        {fid: 3, user: 'dwr', name: 'Dan Romero', score: 92, text: 'Building in public! 💜'},
        {fid: 239, user: 'shreyas', name: 'Shreyas Hariharan', score: 88, text: 'New governance proposal is live!'},
        {fid: 1234, user: 'jessepollak', name: 'Jesse Pollak', score: 90, text: 'Base is scaling Ethereum to billions.'},
        {fid: 6546, user: 'balajis', name: 'Balaji Srinivasan', score: 87, text: 'Network states are the future.'},
        {fid: 7891, user: 'punk6529', name: '6529', score: 85, text: 'Open metaverse updates coming soon.'},
        {fid: 1122, user: 'linda', name: 'Linda Xie', score: 83, text: 'Excited about the latest DeFi innovations!'},
        {fid: 4455, user: 'coopahtroopa', name: 'Cooper Turley', score: 80, text: 'Music NFTs are revolutionizing the industry.'},
        {fid: 9876, user: 'spammer1', name: 'Quick Money', score: 25, text: 'FREE CRYPTO AIRDROP! Click here now!!!'},
        {fid: 9877, user: 'scammer2', name: 'Get Rich Quick', score: 15, text: 'Send 1 ETH get 10 back guaranteed!!!'},
        {fid: 5566, user: 'alice', name: 'Alice Chen', score: 75, text: 'Working on a new zkSNARK implementation.'},
        {fid: 7788, user: 'bob', name: 'Bob Smith', score: 65, text: 'Thoughts on the latest L2 benchmarks?'},
        {fid: 3344, user: 'carol', name: 'Carol Davis', score: 55, text: 'Anyone else having issues with gas fees?'},
        {fid: 9988, user: 'david', name: 'David Lee', score: 45, text: 'Just joined Farcaster, excited to be here!'},
        {fid: 1100, user: 'eve', name: 'Eve Wilson', score: 35, text: 'Check out my new project (unverified link)'}
    ];
    
    var demoCasts = [];
    for (var i = 0; i < demoProfiles.length; i++) {
        var p = demoProfiles[i];
        var likes = Math.floor(Math.random() * 200);
        var recasts = Math.floor(Math.random() * 80);
        var rank = 0.75 * p.score + 0.25 * (Math.log(1 + likes + recasts) * 20);
        
        demoCasts.push({
            hash: '0x' + Date.now().toString(16) + i,
            text: p.text,
            author: {
                username: p.user,
                displayName: p.name,
                walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
                fid: p.fid
            },
            reactions: {
                likes: likes,
                recasts: recasts
            },
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            ethosScore: p.score,
            trustRank: Math.round(rank * 100) / 100
        });
    }
    
    demoCasts.sort(function(a, b) {
        return b.trustRank - a.trustRank;
    });
    
    return res.json({
        success: true,
        channel: channel,
        casts: demoCasts,
        totalCasts: demoCasts.length,
        source: 'demo',
        note: 'Demo data. Configure PINATA_JWT for real Farcaster channels.'
    });
};
