module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'ethos';
    
    if (!process.env.NEYNAR_API_KEY) {
        return res.status(500).json({
            success: false,
            error: 'NEYNAR_API_KEY not configured',
            message: 'Please add NEYNAR_API_KEY in Vercel Environment Variables'
        });
    }
    
    try {
        var neynarUrl = 'https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=' + encodeURIComponent(channel) + '&with_recasts=true&limit=50';
        
        var response = await fetch(neynarUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api_key': process.env.NEYNAR_API_KEY
            }
        });
        
        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('Neynar API error ' + response.status + ': ' + errorText);
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
                    embeds: cast.embeds || [],
                    author: {
                        username: author.username,
                        displayName: author.display_name || author.username,
                        walletAddress: author.custody_address || '0x...',
                        fid: author.fid,
                        pfpUrl: author.pfp_url,
                        followerCount: followerCount,
                        followingCount: followingCount,
                        verifications: verifications
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
                source: 'neynar',
                apiVersion: 'v2'
            });
            
        } else {
            return res.json({
                success: true,
                channel: channel,
                casts: [],
                totalCasts: 0,
                source: 'neynar',
                message: 'No casts found for channel: ' + channel
            });
        }
        
    } catch (error) {
        console.error('Neynar API error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            channel: channel,
            message: 'Failed to fetch data from Neynar API'
        });
    }
};
