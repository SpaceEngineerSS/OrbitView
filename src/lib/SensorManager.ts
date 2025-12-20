export interface DeviceOrientation {
    alpha: number | null; // Compass direction (0-360) / Z-axis
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

    public async requestPermission(): Promise<boolean> {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceOrientationEvent as any).requestPermission();
                return permissionState === 'granted';
            } catch (error) {
                console.error('Permission request failed', error);
                return false;
            }
        }
        return true; // Non-iOS 13+ devices don't need explicit permission
    }

    public start() {
        if (this.isListening) return;

        if (typeof window !== 'undefined') {
            window.addEventListener('deviceorientation', this.handleOrientation, true);
            this.isListening = true;
        }
    }

    public stop() {
        if (!this.isListening) return;

        if (typeof window !== 'undefined') {
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
        // Basic normalization
        // Alpha: 0 is North (if absolute), 0-360
        // Beta: Front-back tilt, -180 to 180
        // Gamma: Left-right tilt, -90 to 90

        // iOS webkitCompassHeading support
        let alpha = event.alpha;
        if ((event as any).webkitCompassHeading) {
            // iOS uses webkitCompassHeading for "true" north relative logic
            // We might need to adjust alpha based on this if we want true north
            // For now, let's stick to standard event props and see if we need a specific iOS fix
            // Actually, for AR, we usually want webkitCompassHeading if available for alpha
            alpha = (event as any).webkitCompassHeading || event.alpha;
        }

        this.orientation = {
            alpha: alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: event.absolute
        };

        this.listeners.forEach(listener => listener(this.orientation));
    };

    public getOrientation() {
        return this.orientation;
    }
}
