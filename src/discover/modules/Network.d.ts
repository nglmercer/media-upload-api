import { EventEmitter } from 'events';
import type { Message, DiscoveryOptions, ServiceInfo } from '../types';
export declare class Network extends EventEmitter {
    private socket;
    private options;
    private serviceInfo;
    private port;
    constructor(serviceInfo: ServiceInfo, port: number, options: Required<DiscoveryOptions>);
    start(): Promise<void>;
    broadcastPresence(type: Message['type']): void;
    stop(): void;
}
