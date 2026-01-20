const mockCasts = [
    { hash: '0x1', text: 'GM! Just shipped a major update to our protocol. The future of decentralized social is here! 🚀', author: { username: 'vitalik', displayName: 'Vitalik Buterin', walletAddress: '0x1234...5678' }, reactions: { likes: 245, recasts: 89 }, ethosScore: 92, trustRank: 98 },
    { hash: '0x2', text: 'Building in public is the way. Excited to see what the community creates! 💜', author: { username: 'dwr', displayName: 'Dan Romero', walletAddress: '0xabcd...ef12' }, reactions: { likes: 156, recasts: 45 }, ethosScore: 88, trustRank: 92 },
    { hash: '0x3', text: 'Check out my new token launch! 100x guaranteed! 💰💰💰 DM for details!', author: { username: 'cryptoscammer', displayName: 'Crypto Expert', walletAddress: '0x9999...9999' }, reactions: { likes: 3, recasts: 0 }, ethosScore: 25, trustRank: 25 },
    { hash: '0x4', text: 'Deep dive into zero-knowledge proofs and their applications in scaling. Thread 🧵👇', author: { username: 'researcher', displayName: 'Crypto Researcher', walletAddress: '0x5555...5555' }, reactions: { likes: 198, recasts: 102 }, ethosScore: 78, trustRank: 87 },
    { hash: '0x5', text: 'Hot take: We need better UX in crypto wallets. Most people still find them confusing.', author: { username: 'builder', displayName: 'Product Builder', walletAddress: '0x7777...7777' }, reactions: { likes: 167, recasts: 54 }, ethosScore: 72, trustRank: 81 },
    { hash: '0x6', text: 'Anyone want to buy my exclusive NFT collection? Only 0.5 ETH each! Limited supply!', author: { username: 'nftflipper', displayName: 'NFT Trader', walletAddress: '0x3333...3333' }, reactions: { likes: 5, recasts: 1 }, ethosScore: 38, trustRank: 38 }
];

export default function handler(req, res) {
    mockCasts.sort((a, b) => b.trustRank - a.trustRank);
    res.status(200).json({ success: true, channel: 'demo', casts: mockCasts });
}
