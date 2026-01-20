let allCasts = [];
let filteredCasts = [];
let expanded = new Set();

const $ = id => document.getElementById(id);

function badge(score) {
    if (score >= 70) return { label: 'High Trust', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    if (score >= 40) return { label: 'Mid Trust', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    return { label: 'Low Trust', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
}

function html(cast) {
    const b = badge(cast.ethosScore || 50);
    const low = (cast.ethosScore || 50) < 40;
    const exp = expanded.has(cast.hash);
    const hide = low && !exp;
    const username = cast.author?.username || 'unknown';
    const displayName = cast.author?.displayName || 'Unknown User';
    const walletAddress = cast.author?.walletAddress || '0x0000...0000';
    const ini = username.slice(0, 2).toUpperCase();
    const text = cast.text || 'No content';
    const trustRank = cast.trustRank || 0;
    const likes = cast.reactions?.likes || 0;
    const recasts = cast.reactions?.recasts || 0;

    return `
        <div class="bg-white rounded-lg shadow-md p-4 ${hide ? 'opacity-75' : ''}" style="animation: fadeIn 0.3s">
            <div class="flex gap-3">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold">${ini}</div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold">${displayName}</span>
                        <span class="text-gray-500 text-sm">@${username}</span>
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${b.bg} ${b.text} flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full ${b.dot}"></span>${b.label}
                        </span>
                        <span class="text-xs text-gray-400">Score: ${cast.ethosScore || 50}</span>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">Trust Rank: ${trustRank.toFixed(1)} • ${walletAddress.slice(0,8)}...</div>
                </div>
            </div>
            ${hide ? `
                <button onclick="toggle('${cast.hash}')" class="mt-3 text-sm text-gray-500 hover:text-gray-700">▼ Low trust (click to expand)</button>
            ` : `
                <p class="mt-3 text-gray-800">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                <div class="flex gap-4 mt-3 text-gray-500 text-sm">
                    <span>❤️ ${likes}</span>
                    <span>🔄 ${recasts}</span>
                </div>
                ${low && exp ? `<button onclick="toggle('${cast.hash}')" class="mt-2 text-sm text-gray-500">▲ Collapse</button>` : ''}
            `}
        </div>
    `;
}

function toggle(hash) {
    expanded.has(hash) ? expanded.delete(hash) : expanded.add(hash);
    render();
}

function filter() {
    const high = $('highTrustFilter').checked;
    const hide = $('hideLowTrustFilter').checked;
    filteredCasts = allCasts.filter(c => {
        const score = c.ethosScore || 50;
        if (high && score < 70) return false;
        if (hide && score < 40) return false;
        return true;
    });
    render();
}

function render() {
    const container = $('casts');
    const empty = $('empty');
    const stats = $('stats');
    
    if (filteredCasts.length) {
        container.innerHTML = filteredCasts.map(html).join('');
        empty.classList.add('hidden');
        stats.classList.remove('hidden');
    } else if (allCasts.length) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        stats.classList.remove('hidden');
    } else {
        container.innerHTML = '';
        empty.classList.add('hidden');
        stats.classList.add('hidden');
    }
    
    $('total').textContent = allCasts.length;
    $('displayed').textContent = filteredCasts.length;
}

async function load() {
    const ch = $('channelInput').value.trim() || 'ethos';
    
    $('loading').classList.remove('hidden');
    $('error').classList.add('hidden');
    $('casts').innerHTML = '';
    $('empty').classList.add('hidden');
    $('stats').classList.add('hidden');

    try {
        const res = await fetch(`/api/channel?channel=${ch}&limit=25`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed');

        allCasts = data.casts || [];
        filteredCasts = allCasts;
        expanded.clear();
        
        $('loading').classList.add('hidden');
        filter();
    } catch (err) {
        $('loading').classList.add('hidden');
        $('error').classList.remove('hidden');
        $('errorMsg').textContent = err.message;
        console.error('Load error:', err);
    }
}

$('loadButton').onclick = load;
$('retry').onclick = load;
$('channelInput').onkeypress = e => e.key === 'Enter' && load();
$('highTrustFilter').onchange = filter;
$('hideLowTrustFilter').onchange = filter;

// Auto-load on page load
load();
