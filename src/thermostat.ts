import {
  API,
  Logging,
  AccessoryConfig,
  AccessoryPlugin,
  Service,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
} from "homebridge";

import storage from "node-persist";

export default class Thermostat implements AccessoryPlugin {
  private readonly service: Service;

  private readonly Characteristic = this.api.hap.Characteristic;

  private readonly manufacturer: string;
  private readonly model: string;

  private temperatureDisplayUnits: CharacteristicValue;

  public constructor(
    private readonly logger: Logging,
    private readonly config: AccessoryConfig,
    private readonly api: API
  ) {
    this.manufacturer = config.manufacturer || "DefaultManufacturer";
    this.model = config.model || "DefaultModel";

    this.temperatureDisplayUnits = config.temperatureDisplayUnits || 0;

    this.logger.debug("Finished initializing accessory:", this.config.name);

    this.service = new this.api.hap.Service.Thermostat(this.config.name);

    this.api.on("didFinishLaunching", async () => {
      await this.initStorage();
    });
  }

  private async initStorage() {
    const cacheDir = this.api.user.persistPath();
    await storage.init({ dir: cacheDir });
  }

  private getCurrentHeatingCoolingState(cb: CharacteristicGetCallback) {
    const key = `${this.config.name}&CurrentHeatingCoolingState`;

    storage.getItem(key).then(async (value) => {
      if (value === undefined) {
        value = 0;
        await storage.setItem(key, value);
      }

      this.logger.info(`CurrentHeatingCoolingState: '${value}'`);
      cb(null, value);
    });
  }

  private getTargetHeatingCoolingState(cb: CharacteristicGetCallback) {
    const key = `${this.config.name}&TargetHeatingCoolingState`;

    storage.getItem(key).then(async (value) => {
      if (value === undefined) {
        value = 0;
        await storage.setItem(key, value);
      }

      this.logger.info(`TargetHeatingCoolingState: '${value}'`);
      cb(null, value);
    });
  }

  private setTargetHeatingCoolingState(
    value: CharacteristicValue,
    cb: CharacteristicSetCallback
  ) {
    storage
      .setItem(`${this.config.name}&TargetHeatingCoolingState`, value)
      .then(() => {
        this.logger.info(`Set TargetHeatingCoolingState to '${value}'`);

        if (value < 3) {
          storage
            .setItem(`${this.config.name}&CurrentHeatingCoolingState`, value)
            .then(() => {
              this.service.setCharacteristic(
                this.Characteristic.CurrentHeatingCoolingState,
                value
              );

              this.logger.info(`Set CurrentHeatingCoolingState to '${value}'`);

              cb();
            });
        } else {
          cb();
        }
      });
  }

  private getCurrentTemperature(cb: CharacteristicGetCallback) {
    const key = `${this.config.name}&CurrentTemperature`;

    storage.getItem(key).then(async (value) => {
      if (value === undefined) {
        value = 20;
        await storage.setItem(key, value);
      }

      this.logger.info(`CurrentTemperature: '${value}'`);
      cb(null, value);
    });
  }

  private getTargetTemperature(cb: CharacteristicGetCallback) {
    const key = `${this.config.name}&TargetTemperature`;

    storage.getItem(key).then(async (value) => {
      if (value === undefined) {
        value = 20;
        await storage.setItem(key, value);
      }

      this.logger.info(`TargetTemperature: '${value}'`);
      cb(null, value);
    });
  }

  private setTargetTemperature(
    value: CharacteristicValue,
    cb: CharacteristicSetCallback
  ) {
    storage.setItem(`${this.config.name}&TargetTemperature`, value).then(() => {
      this.logger.info(`Set TargetTemperature to '${value}'`);

      storage
        .setItem(`${this.config.name}&CurrentTemperature`, value)
        .then(() => {
          this.service.setCharacteristic(
            this.Characteristic.CurrentTemperature,
            value
          );

          this.logger.info(`Set CurrentTemperature to '${value}'`);

          cb();
        });
    });
  }

  private getTemperatureDisplayUnits(cb: CharacteristicGetCallback) {
    cb(null, this.temperatureDisplayUnits);
  }

  private setTemperatureDisplayUnits(
    value: CharacteristicValue,
    cb: CharacteristicSetCallback
  ) {
    storage
      .setItem(`${this.config.name}&TemperatureDisplayUnits`, value)
      .then(() => {
        this.temperatureDisplayUnits = value;

        this.logger.info(`Set TemperatureDisplayUnits to '${value}'`);

        cb();
      });
  }

  private getName(cb: CharacteristicGetCallback) {
    cb(null, this.config.name);
  }

  private getInformationService(): Service {
    return new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(this.Characteristic.Model, this.model);
  }

  public getServices(): Service[] {
    this.service
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .on("get", this.getCurrentHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .on("get", this.getTargetHeatingCoolingState.bind(this))
      .on("set", this.setTargetHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .on("get", this.getCurrentTemperature.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .on("get", this.getTargetTemperature.bind(this))
      .on("set", this.setTargetTemperature.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .on("get", this.getTemperatureDisplayUnits.bind(this))
      .on("set", this.setTemperatureDisplayUnits.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.Name)
      .on("get", this.getName.bind(this));

    return [this.getInformationService(), this.service];
  }
}
