import type { ProgressStore } from './progress/ProgressStore';
import { LocalProgressStore } from './progress/LocalProgressStore';

// TODO
// Später mit Backend: einfach nur new ApiProgressStore() hier austauschen
export const progressStore: ProgressStore = new LocalProgressStore();
