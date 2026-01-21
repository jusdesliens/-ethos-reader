module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'base';
    
    // Liste des channels populaires qui ont du contenu
    var popularChannels = ['base', 'ethereum', 'farcaster', 'degen', 'memes', 'dev', 'crypto', 'nft', 'gaming', 'art'];
    
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
            
            var data = await response.json();
            
            // Vérifier si on a des messages
            if (!data.messages || data.messages.length === 0) {
                // Pas de casts pour ce channel - retourner message informatif
                return res.json({
                    success: false,
                    channel: channel,
                    casts: [],
                    totalCasts: 0,
                    source: 'pinata-hub',
                    message: 'No recent casts found for channel "' + channel + '". Try: ' + popularChannels.join(', '),
                    suggestedChannels: popularChannels
                });
            }
            
            var casts = [];
            
            for (var i = 0; i < data.messages.length; i++) {
                var msg = data.messages[i];
                var castData = msg.data;
                
                if (!castData || !castData.castAddBody) continue;
                
                var fid = castData.fid;
                var text = castData.castAddBody.text || '';
                
                // Skip si pas de texte
                if (!text || text.trim() === '') continue;
                
                // Calculer un Ethos Score simulé basé sur le FID
                var ethosScore;
                if (fid < 100) {
                    ethosScore = Math.floor(85 + Math.random() * 15); // 85-100 (early adopters)
                } else if (fid < 1000) {
                    ethosScore = Math.floor(75 + Math.random() * 20); // 75-95
                } else if (fid < 10000) {
                    ethosScore = Math.floor(65 + Math.random() * 25); // 65-90
                } else if (fid < 100000) {
                    ethosScore = Math.floor(50 + Math.random() * 30); // 50-80
                } else {
                    ethosScore = Math.floor(30 + Math.random() * 40); // 30-70
                }
                
                // Détecter le spam par mots-clés
                var spamKeywords = ['airdrop', 'free', 'claim now', 'send eth', 'guaranteed', '10x', 'giveaway', '100x', 'click here'];
                var textLower = text.toLowerCase();
                var spamCount = 0;
                
                for (var j = 0; j < spamKeywords.length; j++) {
                    if (textLower.includes(spamKeywords[j])) {
                        spamCount++;
                    }
                }
                
                // Détecter les messages avec trop de !!! ou majuscules
                var exclamationCount = (text.match(/!/g) || []).length;
                var capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
                
                var isSpam = spamCount >= 2 || exclamationCount >= 3 || capsRatio > 0.5;
                
                if (isSpam) {
                    ethosScore = Math.min(ethosScore, 35); // Forcer score bas pour spam
                }
                
                // Simuler des réactions basées sur le score
                var baseLikes = Math.floor(ethosScore * 1.5);
                var baseRecasts = Math.floor(ethosScore * 0.5);
                
                var likes = baseLikes + Math.floor(Math.random() * 50);
                var recasts = baseRecasts + Math.floor(Math.random() * 20);
                var replies = Math.floor(Math.random() * 15);
                
                // Trust Rank algorithm
                var engagement = Math.log(1 + likes + recasts + replies);
                var rank = 0.75 * ethosScore + 0.25 * (engagement * 20);
                
                // Créer un username basique
                var username = 'user_' + fid;
                var displayName = 'Farcaster User ' + fid;
                
                // Améliorer le nom pour les FIDs connus
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
                } else if (fid < 1000) {
                    displayName = 'Early Adopter #' + fid;
                }
                
                casts.push({
                    hash: msg.hash,
                    text: text.substring(0, 500), // Limiter la longueur
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
            
            // Si après filtrage on n'a aucun cast
            if (casts.length === 0) {
                return res.json({
                    success: false,
                    channel: channel,
                    casts: [],
                    totalCasts: 0,
                    source: 'pinata-hub',
                    message: 'Channel "' + channel + '" has no valid casts. Try: ' + popularChannels.join(', '),
                    suggestedChannels: popularChannels
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
                note: 'Real Farcaster casts from "' + channel + '" channel'
            });
            
        } catch (error) {
            console.error('Pinata error:', error);
            
            // Retourner une erreur claire
            return res.json({
                success: false,
                channel: channel,
                casts: [],
                totalCasts: 0,
                error: error.message,
                message: 'Could not fetch casts for "' + channel + '". Try: ' + popularChannels.join(', '),
                suggestedChannels: popularChannels
            });
        }
    }
    
    // FALLBACK : Pas de PINATA_JWT configuré
    return res.json({
        success: false,
        channel: channel,
        casts: [],
        totalCasts: 0,
        error: 'PINATA_JWT not configured',
        message: 'Please add PINATA_JWT environment variable in Vercel settings'
    });
};
