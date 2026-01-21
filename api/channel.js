module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'ethos';
    
    // Si PINATA_JWT est configuré, utiliser les vraies données
    if (process.env.PINATA_JWT) {
        try {
            var pinataUrl = 'https://hub.pinata.cloud/v1/castsByParent?url=' + encodeURIComponent('https://warpcast.com/~/channel/' + channel);
            
            var response = await fetch(pinataUrl, {
                headers: {
                    'Authorization': 'Bearer ' + process.env.PINATA_JWT
                }
            });
            
            if (!response.ok) {
                throw new Error('Pinata API error: ' + response.status);
            }
            
            var data = await response.json();
            var casts = [];
            
            // Parser les vrais casts de Pinata
            if (data.messages && data.messages.length > 0) {
                // Récupérer les FIDs uniques
                var fids = [];
                for (var i = 0; i < data.messages.length; i++) {
                    var fid = data.messages[i].data.fid;
                    if (fid && fids.indexOf(fid) === -1) {
                        fids.push(fid);
                    }
                }
                
                // Récupérer les profils utilisateurs
                var userProfiles = {};
                try {
                    for (var j = 0; j < Math.min(fids.length, 50); j++) {
                        var profileUrl = 'https://hub.pinata.cloud/v1/userDataByFid?fid=' + fids[j];
                        var profileResponse = await fetch(profileUrl, {
                            headers: {
                                'Authorization': 'Bearer ' + process.env.PINATA_JWT
                            }
                        });
                        
                        if (profileResponse.ok) {
                            var profileData = await profileResponse.json();
                            var username = null;
                            var displayName = null;
                            var pfpUrl = null;
                            
                            if (profileData.messages && profileData.messages.length > 0) {
                                for (var k = 0; k < profileData.messages.length; k++) {
                                    var msg = profileData.messages[k];
                                    if (msg.data && msg.data.userDataBody) {
                                        if (msg.data.userDataBody.type === 6) {
                                            username = msg.data.userDataBody.value;
                                        } else if (msg.data.userDataBody.type === 2) {
                                            displayName = msg.data.userDataBody.value;
                                        } else if (msg.data.userDataBody.type === 1) {
                                            pfpUrl = msg.data.userDataBody.value;
                                        }
                                    }
                                }
                            }
                            
                            userProfiles[fids[j]] = {
                                username: username || 'user' + fids[j],
                                displayName: displayName || username || 'User ' + fids[j],
                                pfpUrl: pfpUrl
                            };
                        }
                    }
                } catch (profileError) {
                    console.error('Error fetching profiles:', profileError);
                }
                
                // Créer les casts avec les profils enrichis
                for (var i = 0; i < data.messages.length; i++) {
                    var msg = data.messages[i];
                    var castData = msg.data;
                    var fid = castData.fid;
                    
                    var profile = userProfiles[fid] || {
                        username: 'user' + fid,
                        displayName: 'User ' + fid,
                        pfpUrl: null
                    };
                    
                    var ethosScore = Math.floor(Math.random() * 65) + 30;
                    
                    var likes = 0;
                    var recasts = 0;
                    
                    if (castData.castAddBody) {
                        likes = castData.castAddBody.reactionsCount || 0;
                        recasts = castData.castAddBody.recastsCount || 0;
                    }
                    
                    var rank = 0.75 * ethosScore + 0.25 * (Math.log(1 + likes + recasts) * 20);
                    
                    var text = '';
                    if (castData.castAddBody && castData.castAddBody.text) {
                        text = castData.castAddBody.text;
                    }
                    
                    casts.push({
                        hash: msg.hash,
                        text: text,
                        author: {
                            username: profile.username,
                            displayName: profile.displayName,
                            walletAddress: msg.signer || '0x...',
                            fid: fid,
                            pfpUrl: profile.pfpUrl
                        },
                        reactions: {
                            likes: likes,
                            recasts: recasts
                        },
                        timestamp: new Date(msg.data.timestamp * 1000).toISOString(),
                        ethosScore: ethosScore,
                        trustRank: Math.round(rank * 100) / 100
                    });
                }
                
                casts.sort(function(a, b) {
                    return b.trustRank - a.trustRank;
                });
                
                return res.json({
                    success: true,
                    channel: channel,
                    casts: casts,
                    totalCasts: casts.length,
                    source: 'pinata'
                });
            }
        } catch (error) {
            console.error('Pinata error:', error);
        }
    }
    
    // DONNÉES DE DÉMO (si pas de PINATA_JWT ou en cas d'erreur)
    var profiles = [
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
    
    var casts = [];
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        var likes = Math.floor(Math.random() * 200);
        var recasts = Math.floor(Math.random() * 80);
        var rank = 0.75 * p.score + 0.25 * (Math.log(1 + likes + recasts) * 20);
        
        casts.push({
            hash: '0x' + Date.now() + i,
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
    
    casts.sort(function(a, b) {
        return b.trustRank - a.trustRank;
    });
    
    res.json({
        success: true,
        channel: channel,
        casts: casts,
        totalCasts: casts.length,
        source: 'demo'
    });
};
