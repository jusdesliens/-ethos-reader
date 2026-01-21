module.exports = function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    var channel = req.query.channel || 'ethos';
    var profiles = [
        {fid: 5650, user: 'vitalik', name: 'Vitalik Buterin', score: 95, text: 'Just shipped a major protocol update. The future is here! 🚀'},
        {fid: 3, user: 'dwr', name: 'Dan Romero', score: 92, text: 'Building in public is the way. Excited for what is coming! 💜'},
        {fid: 6622, user: 'jessepollak', name: 'Jesse Pollak', score: 89, text: 'Our integration is now live. Check it out.'},
        {fid: 2, user: 'v', name: 'Varun', score: 91, text: 'Deep dive into zero-knowledge proofs. Thread 👇'},
        {fid: 6351, user: 'linda', name: 'Linda Xie', score: 87, text: 'Interesting thoughts on scaling solutions.'},
        {fid: 1234, user: 'builder', name: 'Web3 Builder', score: 72, text: 'Hot take: We need better UX in crypto.'},
        {fid: 5678, user: 'dev', name: 'Crypto Dev', score: 68, text: 'New to Farcaster! Learning about decentralized social.'},
        {fid: 9999, user: 'newbie', name: 'New User', score: 45, text: 'Just joined! Excited to be here.'},
        {fid: 8888, user: 'trader', name: 'NFT Trader', score: 38, text: 'Check my NFT collection! Floor going up 📈'},
        {fid: 7777, user: 'scammer', name: 'Get Rich', score: 25, text: '🚨 New token! 100x guaranteed! DM me! 💰'}
    ];
    
    var casts = [];
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        var likes = Math.floor(Math.random() * 200);
        var recasts = Math.floor(Math.random() * 80);
        var social = Math.log(1 + likes + recasts);
        var rank = 0.75 * p.score + 0.25 * (social * 20);
        var addr = '0x' + p.fid.toString(16).padStart(40, '0');
        
        casts.push({
            hash: '0x' + Date.now() + i,
            text: p.text,
            author: {
                username: p.user,
                displayName: p.name,
                walletAddress: addr.slice(0, 6) + '...' + addr.slice(-4)
            },
            reactions: {likes: likes, recasts: recasts},
            ethosScore: p.score,
            trustRank: rank
        });
    }
    
    casts.sort(function(a, b) {return b.trustRank - a.trustRank;});
    res.json({success: true, channel: channel, casts: casts});
};
