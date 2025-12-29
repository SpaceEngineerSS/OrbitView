import { SpaceObject } from "./space-objects";

/**
 * Data Exporter Module
 * Exports satellite TLE and computed orbital data to CSV/JSON formats
 * 
 * @module Exporter
 */

export interface TelemetryRecord {
    timestamp: Date;
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
}

export interface ExportData {
    satellite: {
        id: string;
        name: string;
        type: string;
        tle?: {
            line1: string;
            line2: string;
        };
    };
    currentTelemetry?: TelemetryRecord;
    telemetryHistory?: TelemetryRecord[];
    exportedAt: string;
}

export type ExportFormat = 'csv' | 'json';

/**
 * Formats a number with fixed decimal places
 */
function formatNumber(num: number, decimals: number = 4): string {
    return num.toFixed(decimals);
}

/**
 * Escapes a string for CSV format
 */
function escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Exports satellite data to CSV format
 * 
 * @param satellite - The satellite object
 * @param telemetry - Current telemetry data
 * @param history - Optional telemetry history
 * @returns CSV string
 */
export function exportToCSV(
    satellite: SpaceObject,
    telemetry?: { lat: number; lon: number; alt: number; velocity: number },
    history?: TelemetryRecord[]
): string {
    const lines: string[] = [];

    // Header comment
    lines.push('# OrbitView Satellite Export');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Satellite: ${satellite.name} (NORAD ID: ${satellite.id})`);
    lines.push('');

    // Satellite metadata
    lines.push('## SATELLITE INFO');
    lines.push('Field,Value');
    lines.push(`NORAD_ID,${satellite.id}`);
    lines.push(`Name,${escapeCSV(satellite.name)}`);
    lines.push(`Type,${satellite.type}`);

    if (satellite.tle) {
        lines.push(`TLE_Line1,${escapeCSV(satellite.tle.line1)}`);
        lines.push(`TLE_Line2,${escapeCSV(satellite.tle.line2)}`);
    }
    lines.push('');

    // Current telemetry
    if (telemetry) {
        lines.push('## CURRENT TELEMETRY');
        lines.push('Timestamp,Latitude,Longitude,Altitude_km,Velocity_km_s');
        lines.push(`${new Date().toISOString()},${formatNumber(telemetry.lat)},${formatNumber(telemetry.lon)},${formatNumber(telemetry.alt, 2)},${formatNumber(telemetry.velocity, 4)}`);
        lines.push('');
    }

    // Telemetry history
    if (history && history.length > 0) {
        lines.push('## TELEMETRY HISTORY');
        lines.push('Timestamp,Latitude,Longitude,Altitude_km,Velocity_km_s');
        for (const record of history) {
            lines.push(
                `${record.timestamp.toISOString()},${formatNumber(record.latitude)},${formatNumber(record.longitude)},${formatNumber(record.altitude, 2)},${formatNumber(record.velocity, 4)}`
            );
        }
    }

    return lines.join('\n');
}

/**
 * Exports satellite data to JSON format
 * 
 * @param satellite - The satellite object
 * @param telemetry - Current telemetry data
 * @param history - Optional telemetry history
 * @returns JSON string
 */
export function exportToJSON(
    satellite: SpaceObject,
    telemetry?: { lat: number; lon: number; alt: number; velocity: number },
    history?: TelemetryRecord[]
): string {
    const data: ExportData = {
        satellite: {
            id: satellite.id,
            name: satellite.name,
            type: satellite.type,
            tle: satellite.tle ? {
                line1: satellite.tle.line1,
                line2: satellite.tle.line2
            } : undefined
        },
        currentTelemetry: telemetry ? {
            timestamp: new Date(),
            latitude: telemetry.lat,
            longitude: telemetry.lon,
            altitude: telemetry.alt,
            velocity: telemetry.velocity
        } : undefined,
        telemetryHistory: history,
        exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Triggers a file download in the browser
 * 
 * @param content - File content as string
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Exports satellite data with automatic file download
 * 
 * @param format - Export format ('csv' or 'json')
 * @param satellite - The satellite object
 * @param telemetry - Current telemetry data
 * @param history - Optional telemetry history
 */
export function exportSatelliteData(
    format: ExportFormat,
    satellite: SpaceObject,
    telemetry?: { lat: number; lon: number; alt: number; velocity: number },
    history?: TelemetryRecord[]
): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeFileName = satellite.name.replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'csv') {
        const content = exportToCSV(satellite, telemetry, history);
        const filename = `${safeFileName}_${satellite.id}_${timestamp}.csv`;
        downloadFile(content, filename, 'text/csv;charset=utf-8');
    } else {
        const content = exportToJSON(satellite, telemetry, history);
        const filename = `${safeFileName}_${satellite.id}_${timestamp}.json`;
        downloadFile(content, filename, 'application/json');
    }
}

export default {
    exportToCSV,
    exportToJSON,
    exportSatelliteData,
    downloadFile
};
