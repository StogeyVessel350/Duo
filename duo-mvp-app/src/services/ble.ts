export interface RepEvent {
  t: number;
  rep: number;
  side: 'L' | 'R' | 'both';
  peakV: number;
  avgV: number;
  rom: number;
  tilt: number;
}

type Listener = (evt: RepEvent) => void;

interface Observable {
  subscribe: (fn: Listener) => () => void;
  emit: (evt: RepEvent) => void;
}

function createObservable(): Observable {
  const listeners = new Set<Listener>();
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit(evt) {
      listeners.forEach(fn => fn(evt));
    },
  };
}

export interface MockVeloBar {
  events: Observable;
  start: () => void;
  stop: () => void;
  setImbalance: (pct: number) => void;
}

export function createMockVeloBar(baseV = 0.72, imbalancePct = 0.0): MockVeloBar {
  const events = createObservable();
  let timer: ReturnType<typeof setInterval> | null = null;
  let rep = 0;
  let imbalance = imbalancePct;

  function start() {
    rep = 0;
    timer = setInterval(() => {
      rep += 1;
      const decay = Math.max(0.6, 1 - rep * 0.025);
      const noise = () => (Math.random() - 0.5) * 0.04;
      const leftV = parseFloat((baseV * decay + noise()).toFixed(3));
      const rightV = parseFloat((leftV * (1 - imbalance) + noise()).toFixed(3));

      const evt: RepEvent = {
        t: Date.now(),
        rep,
        side: 'both',
        peakV: Math.max(leftV, rightV),
        avgV: parseFloat(((leftV + rightV) / 2).toFixed(3)),
        rom: parseFloat((0.55 + Math.random() * 0.1).toFixed(3)),
        tilt: parseFloat(((rightV - leftV) * 100).toFixed(1)),
      };
      events.emit(evt);
    }, 2800);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  return { events, start, stop, setImbalance: pct => { imbalance = pct; } };
}

let _instance: MockVeloBar | null = null;

export function getVeloBar(): MockVeloBar {
  if (!_instance) _instance = createMockVeloBar();
  return _instance;
}
