import * as config from 'config';
import {ConfObj} from './objects';

/**
 * Config Singleton
 */
export class ConfigSingleton {
  private static instance: ConfigSingleton | null = null;
  config: ConfObj;
  /**
   * Constructor
   */
  constructor() {
    this.config = config as ConfObj;
  }

  /**
   * Statische Methode zur Rückgabe der Singleton-Instanz
   */
  public static getInstance(): ConfigSingleton {
    if (!ConfigSingleton.instance) {
      ConfigSingleton.instance = new ConfigSingleton();
    }
    return ConfigSingleton.instance;
  }
}
