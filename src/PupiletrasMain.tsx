import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────
//palabras
interface PlacedWord {
    word: string;
    cells: [number, number][];
}

interface GameData {
    grid: string[][];
    placed: PlacedWord[];
}

const WORDS = ["BIENESTAR", "FINANCIERO", "SOCIAL", "EMOCIONAL", "ESFUERZO"];
const GRID_SIZE = 10;
const DIRECTIONS: [number, number][] = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]];
const cellKey = (r: number, c: number) => `${r}-${c}`;

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────

function generateGrid(words: string[]): GameData {
    const grid: string[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
    const placed: PlacedWord[] = [];

    for (const word of words) {
        let wordPlaced = false;
        let tries = 0;

        while (tries++ < 200 && !wordPlaced) {
            const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);

            const cells: [number, number][] = [];
            let fits = true;

            for (let i = 0; i < word.length; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) { fits = false; break; }
                if (grid[r][c] !== "" && grid[r][c] !== word[i]) { fits = false; break; }
                cells.push([r, c]);
            }

            if (fits) {
                cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
                placed.push({ word, cells });
                wordPlaced = true;
            }
        }
    }

    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++)
            if (grid[r][c] === "") grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

    return { grid, placed };
}

function buildSelectionPath(start: [number, number], end: [number, number]): [number, number][] {
    const [sr, sc] = start;
    const dr = end[0] - sr;
    const dc = end[1] - sc;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (len === 0) return [start];

    const isDiagonal = dr !== 0 && dc !== 0;
    if (isDiagonal && Math.abs(dr) !== Math.abs(dc)) return [];

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    return Array.from({ length: len + 1 }, (_, i) => [sr + stepR * i, sc + stepC * i]);
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

const GradientPill = ({ children }: { children: React.ReactNode }) => (
    <div
        className="inline-flex items-center gap-3 px-6 py-2 rounded-full text-white font-bold text-sm shadow-md bg-fuchsia-500 "
        
    >
        {children}
    </div>
);

const Header = ({ found, total }: { found: number; total: number }) => (
    <header className="text-center mb-8">
        <h1 className="text-5xl font-black tracking-tight mb-3 text-sky-600" >
            Pupiletras Financiero
        </h1>
        <p className="text-sky-500 font-medium tracking-widest uppercase mb-4 text-sm">
            Encuentra todas las palabras ocultas
        </p>
        <GradientPill>
            <span>Palabras encontradas</span>
            <span className="text-xl font-black px-2 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
                {found}/{total}
            </span>
        </GradientPill>
    </header>
);

const WordList = ({ words, foundWords }: { words: string[]; foundWords: string[] }) => (
    <div className="rounded-2xl p-5 shadow-xl bg-sky-700/90" style={{  minWidth: 180 }}>
        <h2 className="text-white font-black text-sm uppercase tracking-widest mb-4 opacity-60">Palabras</h2>
        <ul className="space-y-2">
            {words.map((word) => {
                const found = foundWords.includes(word);
                return (
                    <li key={word} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: found ? "fuchsia" : "#ffffff30" }} />
                        <span
                            className="font-bold text-sm tracking-wider transition-all duration-300"
                            style={{ color: found ? "fuchsia" : "white", textDecoration: found ? "line-through" : "none", opacity: found ? 0.4 : 1 }}
                        >
                            {word}
                        </span>
                    </li>
                );
            })}
        </ul>
    </div>
);

const Cell = ({
    letter, isSelected, isFound, onMouseDown, onMouseEnter,
}: {
    letter: string; isSelected: boolean; isFound: boolean;
    onMouseDown: () => void; onMouseEnter: () => void;
}) => (
    <td
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        className="select-none cursor-pointer"
        style={{
            width: 50, height: 50,
            textAlign: "center",
            fontFamily: "'Georgia', serif",
            fontWeight: 900, fontSize: 20,
            borderRadius: 6,
            transition: "background 0.15s, transform 0.1s",
            background: isSelected ? "rgba(0,0,0,0.3)" : isFound ? "fuchsia" : "transparent",
            color: isSelected || isFound ? "white" : "#1a1a2e",
            transform: isSelected ? "scale(1.15)" : "scale(1)",
            userSelect: "none",
        }}
    >
        {letter}
    </td>
);

const Grid = ({ grid, selectedKeys, foundKeys, onMouseDown, onMouseEnter }: {
    grid: string[][];
    selectedKeys: Set<string>;
    foundKeys: Set<string>;
    onMouseDown: (r: number, c: number) => void;
    onMouseEnter: (r: number, c: number) => void;
}) => (
    <div className="rounded-2xl p-4 shadow-2xl" style={{ background: "white", border: "2px solid #e8eaf6" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 3 }} draggable={false}>
            <tbody>
                {grid.map((row, r) => (
                    <tr key={r}>
                        {row.map((letter, c) => (
                            <Cell
                                key={c}
                                letter={letter}
                                isSelected={selectedKeys.has(cellKey(r, c))}
                                isFound={foundKeys.has(cellKey(r, c))}
                                onMouseDown={() => onMouseDown(r, c)}
                                onMouseEnter={() => onMouseEnter(r, c)}
                            />
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const CompletionModal = ({ onRestart }: { onRestart: () => void }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
        <div className="rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4" style={{ background: "white", animation: "popIn 0.5s cubic-bezier(.175,.885,.32,1.275)" }}>
            <h2 className="text-4xl font-black mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1a1a2e" }}>¡Felicidades!</h2>
            <p className="text-slate-500 text-base mb-8 font-medium">Completaste el pupiletras.<br />¡Eres un campeón!</p>
            <button onClick={onRestart} className="px-8 py-3 rounded-full font-black text-white text-base shadow-lg active:scale-95 transition-transform cursor-pointer" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                Reiniciar
            </button>
        </div>
    </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export const PupiletrasMain = () => {
    const [gameData, setGameData] = useState<GameData>(() => generateGrid(WORDS));
    const [selecting, setSelecting] = useState(false);
    const [selection, setSelection] = useState<[number, number][]>([]);
    const [foundCells, setFoundCells] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);
    const confettiFired = useRef(false);

    useEffect(() => {
        if (!completed || confettiFired.current) return;
        confettiFired.current = true;
        const end = Date.now() + 3000;
        const burst = () => {
            confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(burst);
        };
        burst();
    }, [completed]);

    const checkSelection = useCallback((cells: [number, number][]) => {
        const selKeys = cells.map(([r, c]) => cellKey(r, c));
        const selKeysReversed = [...selKeys].reverse();

        for (const { word, cells: wordCells } of gameData.placed) {
            if (foundWords.includes(word)) continue;
            const wordKeys = wordCells.map(([r, c]) => cellKey(r, c));
            if (wordKeys.length !== selKeys.length) continue;

            const matchForward = wordKeys.every((k, i) => k === selKeys[i]);
            const matchReverse = wordKeys.every((k, i) => k === selKeysReversed[i]);

            if (matchForward || matchReverse) {
                const updated = [...foundWords, word];
                setFoundWords(updated);
                setFoundCells((prev) => [...prev, ...wordKeys]);
                if (updated.length === WORDS.length) setTimeout(() => setCompleted(true), 300);
                return;
            }
        }
    }, [gameData.placed, foundWords]);

    const handleMouseDown = (r: number, c: number) => { setSelecting(true); setSelection([[r, c]]); };

    const handleMouseEnter = (r: number, c: number) => {
        if (!selecting || !selection[0]) return;
        const path = buildSelectionPath(selection[0], [r, c]);
        if (path.length > 0) setSelection(path);
    };

    const handleMouseUp = () => {
        if (selecting && selection.length > 0) checkSelection(selection);
        setSelecting(false);
        setSelection([]);
    };

    const restart = () => {
        confettiFired.current = false;
        setGameData(generateGrid(WORDS));
        setFoundCells([]); setFoundWords([]);
        setSelection([]); setSelecting(false); setCompleted(false);
    };

    return (
        <>
            <style>{`@keyframes popIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>

            <div
                className="min-h-screen flex flex-col items-center justify-center p-6"
                style={{ background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)" }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <Header found={foundWords.length} total={WORDS.length} />

                <div className="flex gap-8 items-start">
                    <Grid
                        grid={gameData.grid}
                        selectedKeys={new Set(selection.map(([r, c]) => cellKey(r, c)))}
                        foundKeys={new Set(foundCells)}
                        onMouseDown={handleMouseDown}
                        onMouseEnter={handleMouseEnter}
                    />
                    <WordList words={WORDS} foundWords={foundWords} />
                </div>
            </div>

            {completed && <CompletionModal onRestart={restart} />}
        </>
    );
};

export default PupiletrasMain;