export interface DeviceOrientation {
    alpha: number | null; // Compass heading, clockwise from north (0-360); null if unknown
    beta: number | null;  // Front-to-back tilt (-180 to 180) / X-axis
    gamma: number | null; // Left-to-right tilt (-90 to 90) / Y-axis
    absolute: boolean;
}

type OrientationHandler = (orientation: DeviceOrientation) => void;

export class SensorManager {
    private static instance: SensorManager;
    private listeners: OrientationHandler[] = [];
    private isListening = false;
    private orientation: DeviceOrientation = { alpha: 0, beta: 0, gamma: 0, absolute: false };

    private constructor() { }

    public static getInstance(): SensorManager {
        if (!SensorManager.instance) {
            SensorManager.instance = new SensorManager();
        }
        return SensorManager.instance;
    }

    /**
     * iOS 13+ asks the user before exposing orientation. Elsewhere there is no
     * prompt, so we only check that the API exists at all.
     */
    public async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return false;
        const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
        if (typeof ctor.requestPermission === 'function') {
            try {
                return (await ctor.requestPermission()) === 'granted';
            } catch {
                return false;
            }
        }
        return true;
    }

    public start() {
        if (this.isListening) return;

        if (typeof window !== 'undefined') {
            // Chrome on Android only reports a north-referenced alpha on this event.
            window.addEventListener('deviceorientationabsolute', this.handleOrientation as EventListener, true);
            window.addEventListener('deviceorientation', this.handleOrientation, true);
            this.isListening = true;
        }
    }

    public stop() {
        if (!this.isListening) return;

        if (typeof window !== 'undefined') {
            window.removeEventListener('deviceorientationabsolute', this.handleOrientation as EventListener, true);
            window.removeEventListener('deviceorientation', this.handleOrientation, true);
            this.isListening = false;
        }
    }

    public subscribe(handler: OrientationHandler) {
        this.listeners.push(handler);
        return () => {
            this.listeners = this.listeners.filter(h => h !== handler);
        };
    }

    private handleOrientation = (event: DeviceOrientationEvent) => {
        // iOS Safari exposes a true compass heading (clockwise from north).
        // Elsewhere alpha is counter-clockwise and only north-referenced when
        // the event is absolute, so convert it to a clockwise heading then.
        const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
        let alpha: number | null = null;
        if (typeof iosHeading === 'number' && Number.isFinite(iosHeading)) {
            alpha = iosHeading;
        } else if (event.absolute && event.alpha !== null) {
            alpha = (360 - event.alpha) % 360;
        }

        this.orientation = {
            alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: alpha !== null
        };

        this.listeners.forEach(listener => listener(this.orientation));
    };

    public getOrientation() {
        return this.orientation;
    }
}
