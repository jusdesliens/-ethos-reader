module.exports = function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var url = new URL(req.url, 'http://localhost');
    var channel = url.searchParams.get('channel') || 'ethos';
    
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
        totalCasts: casts.length
    });
};
