import { InteractionManager } from 'react-native';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();

  static startTimer(name: string) {
    this.metrics.set(name, {
      name,
      startTime: Date.now()
    });
  }

  static endTimer(name: string) {
    const metric = this.metrics.get(name);
    if (metric) {
      const endTime = Date.now();
      metric.endTime = endTime;
      metric.duration = endTime - metric.startTime;
      
      console.log(`Performance: ${name} took ${metric.duration}ms`);
      
      // Send to monitoring service
      this.reportMetric(metric);
    }
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    return fn().finally(() => {
      this.endTimer(name);
    });
  }

  static measureInteraction(name: string, fn: () => void) {
    InteractionManager.runAfterInteractions(() => {
      this.startTimer(name);
      fn();
      this.endTimer(name);
    });
  }

  private static reportMetric(metric: PerformanceMetric) {
    // Report to monitoring service (replace with actual service)
    if (metric.duration && metric.duration > 1000) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.duration}ms`);
    }
  }

  static trackMemoryUsage() {
    // Track memory usage if available
    if (global.performance && global.performance.memory) {
      const memory = (global.performance as any).memory;
      console.log('Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576),
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
      });
    }
  }
}