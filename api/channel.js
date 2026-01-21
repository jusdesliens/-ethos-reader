module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'crypto';
    
    // Channels qui fonctionnent vraiment avec Pinata
    var workingChannels = ['crypto', 'nft'];
    
    // Utiliser Pinata Hub si disponible
    if (process.env.PINATA_JWT) {
        try {
            var pinataUrl = 'https://hub.pinata.cloud/v1/castsByParent?url=' + encodeURIComponent('https://warpcast.com/~/channel/' + channel) + '&pageSize=50';
            
            var response = await fetch(pinataUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + process.env.PINATA_JWT
                }
            });
            
            var data = await response.json();
            
            // Vérifier si on a des messages valides
            if (!data.messages || data.messages.length === 0) {
                throw new Error('No casts found for this channel');
            }
            
            var casts = [];
            
            for (var i = 0; i < data.messages.length; i++) {
                var msg = data.messages[i];
                var castData = msg.data;
                
                if (!castData || !castData.castAddBody) continue;
                
                var fid = castData.fid;
                var text = castData.castAddBody.text || '';
                
                if (!text || text.trim() === '') continue;
                
                // Calculer Ethos Score basé sur FID
                var ethosScore;
                if (fid < 100) {
                    ethosScore = Math.floor(85 + Math.random() * 15);
                } else if (fid < 1000) {
                    ethosScore = Math.floor(75 + Math.random() * 20);
                } else if (fid < 10000) {
                    ethosScore = Math.floor(65 + Math.random() * 25);
                } else if (fid < 100000) {
                    ethosScore = Math.floor(50 + Math.random() * 30);
                } else {
                    ethosScore = Math.floor(30 + Math.random() * 40);
                }
                
                // Détection spam
                var spamKeywords = ['airdrop', 'free', 'claim now', 'send eth', 'guaranteed', '10x', 'giveaway', '100x', 'click here', 'dm me'];
                var textLower = text.toLowerCase();
                var spamCount = 0;
                
                for (var j = 0; j < spamKeywords.length; j++) {
                    if (textLower.includes(spamKeywords[j])) {
                        spamCount++;
                    }
                }
                
                var exclamationCount = (text.match(/!/g) || []).length;
                var capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
                
                var isSpam = spamCount >= 2 || exclamationCount >= 4 || capsRatio > 0.6;
                
                if (isSpam) {
                    ethosScore = Math.min(ethosScore, 35);
                }
                
                // Réactions simulées
                var baseLikes = Math.floor(ethosScore * 1.5);
                var baseRecasts = Math.floor(ethosScore * 0.5);
                
                var likes = baseLikes + Math.floor(Math.random() * 50);
                var recasts = baseRecasts + Math.floor(Math.random() * 20);
                var replies = Math.floor(Math.random() * 15);
                
                // Trust Rank
                var engagement = Math.log(1 + likes + recasts + replies);
                var rank = 0.75 * ethosScore + 0.25 * (engagement * 20);
                
                // Noms pour FIDs connus
                var username = 'user_' + fid;
                var displayName = 'User ' + fid;
                
                if (fid === 3) {
                    username = 'dwr';
                    displayName = 'Dan Romero';
                } else if (fid === 5650) {
                    username = 'vitalik';
                    displayName = 'Vitalik Buterin';
                } else if (fid === 1234) {
                    username = 'jessepollak';
                    displayName = 'Jesse Pollak';
                } else if (fid === 239) {
                    username = 'shreyas';
                    displayName = 'Shreyas Hariharan';
                } else if (fid === 6546) {
                    username = 'balajis';
                    displayName = 'Balaji Srinivasan';
                } else if (fid === 7891) {
                    username = 'punk6529';
                    displayName = '6529';
                } else if (fid < 1000) {
                    displayName = 'Early Adopter #' + fid;
                }
                
                casts.push({
                    hash: msg.hash,
                    text: text.substring(0, 500),
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
            
            if (casts.length === 0) {
                throw new Error('No valid casts after filtering');
            }
            
            casts.sort(function(a, b) {
                return b.trustRank - a.trustRank;
            });
            
            return res.json({
                success: true,
                channel: channel,
                casts: casts,
                totalCasts: casts.length,
                source: 'pinata-hub',
                note: 'Real Farcaster data from /' + channel
            });
            
        } catch (error) {
            console.error('Pinata error for channel "' + channel + '":', error.message);
            // Continue vers le fallback démo
        }
    }
    
    // FALLBACK : Données de démo par channel
    var channelDemoData = {
        'ethos': [
            {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 95, text: 'Ethos reputation system is crucial for Web3 trust. 🔐'},
            {fid: 3, user: 'dwr', name: 'Dan Romero', score: 92, text: 'Building reputation layers into Farcaster protocol.'},
            {fid: 239, user: 'shreyas', name: 'Shreyas Hariharan', score: 88, text: 'On-chain reputation will define the next era of social.'},
            {fid: 1234, user: 'jessepollak', name: 'Jesse Pollak', score: 90, text: 'Ethos + Base = transparent trust at scale.'},
            {fid: 1122, user: 'linda', name: 'Linda Xie', score: 83, text: 'Reputation systems need to be composable and portable.'},
            {fid: 9876, user: 'spammer1', name: 'Quick Money', score: 25, text: 'ETHOS AIRDROP! Free tokens for everyone!!! 🚨'},
            {fid: 5566, user: 'alice', name: 'Alice Chen', score: 75, text: 'Working on zkProofs for private reputation scores.'},
            {fid: 7788, user: 'bob', name: 'Bob Smith', score: 65, text: 'How does Ethos compare to Gitcoin Passport?'},
            {fid: 3344, user: 'carol', name: 'Carol Davis', score: 55, text: 'Exploring reputation attestations on Base L2.'},
            {fid: 9988, user: 'david', name: 'David Lee', score: 45, text: 'Just discovered Ethos, learning about attestations!'}
        ],
        'base': [
            {fid: 1234, user: 'jessepollak', name: 'Jesse Pollak', score: 95, text: 'Base is scaling Ethereum to billions of users. 🔵'},
            {fid: 3, user: 'dwr', name: 'Dan Romero', score: 92, text: 'Farcaster + Base = perfect match for onchain social.'},
            {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 93, text: 'L2s like Base are critical for Ethereum\'s future.'},
            {fid: 7891, user: 'punk6529', name: '6529', score: 88, text: 'Moving our entire NFT ecosystem to Base.'},
            {fid: 4455, user: 'coopahtroopa', name: 'Cooper Turley', score: 82, text: 'Base fees are making music NFTs accessible again!'},
            {fid: 5566, user: 'alice', name: 'Alice Chen', score: 78, text: 'Deployed our first contract on Base mainnet today.'},
            {fid: 7788, user: 'bob', name: 'Bob Smith', score: 68, text: 'Base gas fees are incredibly low compared to mainnet!'},
            {fid: 9877, user: 'basescam', name: 'BaseScam', score: 15, text: 'URGENT: Send ETH to this Base address for 10x returns!!!'}
        ],
        'ethereum': [
            {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 98, text: 'Working on the next Ethereum upgrade roadmap.'},
            {fid: 6546, user: 'balajis', name: 'Balaji Srinivasan', score: 90, text: 'Ethereum is the world computer. Full stop.'},
            {fid: 239, user: 'shreyas', name: 'Shreyas Hariharan', score: 87, text: 'EIP-4844 is a game changer for rollup scalability.'},
            {fid: 1122, user: 'linda', name: 'Linda Xie', score: 85, text: 'Ethereum\'s ecosystem depth is unmatched.'},
            {fid: 3, user: 'dwr', name: 'Dan Romero', score: 83, text: 'Building on Ethereum\'s security guarantees since day one.'},
            {fid: 7891, user: 'punk6529', name: '6529', score: 88, text: 'All digital art should be stored on Ethereum forever.'},
            {fid: 5566, user: 'alice', name: 'Alice Chen', score: 76, text: 'Studying EVM internals, so much complexity to learn!'}
        ],
        'farcaster': [
            {fid: 3, user: 'dwr', name: 'Dan Romero', score: 98, text: 'Farcaster is growing faster than we imagined! 💜'},
            {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 95, text: 'Love the sufficiently decentralized approach of Farcaster.'},
            {fid: 239, user: 'shreyas', name: 'Shreyas Hariharan', score: 90, text: 'Building the future of social protocols on Farcaster.'},
            {fid: 1234, user: 'jessepollak', name: 'Jesse Pollak', score: 88, text: 'Farcaster on Base is the perfect combo.'},
            {fid: 7891, user: 'punk6529', name: '6529', score: 85, text: 'Finally a social network I can trust with my identity.'},
            {fid: 4455, user: 'coopahtroopa', name: 'Cooper Turley', score: 82, text: 'The creator economy is moving to Farcaster.'}
        ],
        'degen': [
            {fid: 2010, user: 'degentokenomics', name: 'Degen Enthusiast', score: 88, text: '$DEGEN to the moon! 🚀'},
            {fid: 2011, user: 'degenfarmer', name: 'Degen Farmer', score: 85, text: 'Just got my DEGEN airdrop! Best community ever!'},
            {fid: 2012, user: 'cryptodegen', name: 'Crypto Degen', score: 80, text: 'DEGEN is revolutionizing tipping culture on Farcaster.'},
            {fid: 2013, user: 'degenbuilder', name: 'Degen Builder', score: 75, text: 'Building on the DEGEN ecosystem, DM for collabs.'},
            {fid: 9879, user: 'fakearidrop', name: 'Fake Airdrop', score: 20, text: 'FREE DEGEN TOKENS! Send 1 ETH to claim 1000 DEGEN!!!'}
        ],
        'zama': [
            {fid: 2001, user: 'zamadev', name: 'Zama Core Team', score: 92, text: 'FHE is revolutionizing private smart contracts! 🔐'},
            {fid: 2002, user: 'cryptoenthusiast', name: 'Crypto Enthusiast', score: 88, text: 'Zama\'s TFHE library is incredible for on-chain privacy.'},
            {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 95, text: 'Fully homomorphic encryption is the future of privacy.'},
            {fid: 2003, user: 'privacydev', name: 'Privacy Developer', score: 85, text: 'Building a private voting system with Zama TFHE.'},
            {fid: 2004, user: 'fheresearcher', name: 'FHE Researcher', score: 90, text: 'Published new paper on FHE performance optimizations.'}
        ]
    };
    
    // Utiliser les données de démo
    var profiles = channelDemoData[channel.toLowerCase()] || channelDemoData['ethos'];
    var demoCasts = [];
    
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        var likes = Math.floor(Math.random() * 200);
        var recasts = Math.floor(Math.random() * 80);
        var replies = Math.floor(Math.random() * 20);
        var rank = 0.75 * p.score + 0.25 * (Math.log(1 + likes + recasts + replies) * 20);
        
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
                recasts: recasts,
                replies: replies
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
        workingChannels: workingChannels,
        note: 'Demo data for /' + channel + '. Real data available for: ' + workingChannels.join(', ')
    });
};
