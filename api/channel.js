module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'ethos';
    
    if (!process.env.NEYNAR_API_KEY) {
        return res.status(500).json({
            success: false,
            error: 'NEYNAR_API_KEY not configured'
        });
    }
    
    try {
        // Utiliser l'endpoint GRATUIT: feed/filter avec channel_id
        var neynarUrl = 'https://api.neynar.com/v2/farcaster/feed/filter?filter_type=channel_id&channel_id=' + encodeURIComponent(channel) + '&with_recasts=false&limit=50';
        
        var response = await fetch(neynarUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': process.env.NEYNAR_API_KEY
            }
        });
        
        if (!response.ok) {
            var errorText = await response.text();
            
            // Si l'endpoint channel filter ne marche pas, utiliser le feed général
            if (response.status === 402) {
                console.log('Channel filter requires payment, using general feed with filter');
                
                // Fallback: récupérer le feed général et filtrer côté serveur
                var generalUrl = 'https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=fids&fids=3,5650,239,1234&with_recasts=false&limit=50';
                
                var generalResponse = await fetch(generalUrl, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'api_key': process.env.NEYNAR_API_KEY
                    }
                });
                
                if (!generalResponse.ok) {
                    throw new Error('All Neynar endpoints require payment');
                }
                
                response = generalResponse;
                var note = 'Using general feed (channel-specific feed requires paid plan)';
            } else {
                throw new Error('Neynar API error ' + response.status + ': ' + errorText);
            }
        }
        
        var data = await response.json();
        var casts = [];
        
        if (data.casts && data.casts.length > 0) {
            for (var i = 0; i < data.casts.length; i++) {
                var cast = data.casts[i];
                var author = cast.author;
                
                var followerCount = author.follower_count || 0;
                var followingCount = author.following_count || 0;
                var verifications = author.verifications?.length || 0;
                
                var followRatio = followingCount > 0 ? Math.min(1, followerCount / followingCount) : 0;
                var ethosScore = Math.min(95, Math.max(30, 
                    30 + Math.floor(Math.log(1 + followerCount) * 6) + 
                    (followRatio * 10) + 
                    (verifications * 5)
                ));
                
                var likes = cast.reactions?.likes_count || 0;
                var recasts = cast.reactions?.recasts_count || 0;
                var replies = cast.replies?.count || 0;
                
                var engagement = Math.log(1 + likes + recasts + replies);
                var rank = 0.75 * ethosScore + 0.25 * (engagement * 20);
                
                casts.push({
                    hash: cast.hash,
                    text: cast.text || '',
                    author: {
                        username: author.username,
                        displayName: author.display_name || author.username,
                        walletAddress: author.custody_address || '0x...',
                        fid: author.fid,
                        pfpUrl: author.pfp_url,
                        followerCount: followerCount
                    },
                    reactions: {
                        likes: likes,
                        recasts: recasts,
                        replies: replies
                    },
                    timestamp: cast.timestamp,
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
                source: 'neynar-free-tier',
                note: 'Channel-specific feeds require Neynar paid plan. Showing general feed.'
            });
            
        } else {
            return res.json({
                success: true,
                channel: channel,
                casts: [],
                totalCasts: 0,
                source: 'neynar'
            });
        }
        
    } catch (error) {
        console.error('Neynar error:', error);
        
        // FALLBACK COMPLET vers données de démo
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
        
        return res.json({
            success: true,
            channel: channel,
            casts: casts,
            totalCasts: casts.length,
            source: 'demo',
            note: 'Using demo data. Real Farcaster APIs require paid plans.'
        });
    }
};
