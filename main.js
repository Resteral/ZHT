const captains = [
    { name: "Slayer_SC2", budget: 1000, roster: [] },
    { name: "IceBoss", budget: 1000, roster: [] },
    { name: "PuckMaster", budget: 1000, roster: [] },
    { name: "HockeyKing", budget: 1000, roster: [] },
    { name: "VoidWalker", budget: 1000, roster: [] },
    { name: "ArtosisP", budget: 1000, roster: [] },
    { name: "FlashFan", budget: 1000, roster: [] },
    { name: "GGWP_Admin", budget: 1000, roster: [] }
];

let turn = 0;
let direction = 1;

// Setup UI
const leftCol = document.getElementById('captains-left');
const rightCol = document.getElementById('captains-right');

function render() {
    leftCol.innerHTML = ''; rightCol.innerHTML = '';
    captains.forEach((cap, i) => {
        const card = document.createElement('div');
        card.className = `captain-card ${i === turn ? 'active' : ''}`;
        card.innerHTML = `
            <strong>${cap.name}</strong>
            <div style="color:var(--gold)">$${cap.budget} Credits</div>
            <div style="font-size:0.7rem">Roster: ${cap.roster.length}/6</div>
        `;
        if (i < 4) leftCol.appendChild(card);
        else rightCol.appendChild(card);
    });
}

// Simulated Sound (Low-latency AudioContext)
function playReadySound() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 523.25; // C5
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 200);
}

document.getElementById('ready-btn').onclick = () => {
    document.getElementById('ready-modal').classList.add('hidden');
    playReadySound();
};

// Start Up
render();
setTimeout(() => document.getElementById('ready-modal').classList.remove('hidden'), 1500);