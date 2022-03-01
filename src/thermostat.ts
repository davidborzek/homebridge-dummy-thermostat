import { writeFileSync, readFileSync, existsSync } from 'fs';
import {
	API,
	Logging,
	AccessoryConfig,
	AccessoryPlugin,
	Service,
	CharacteristicGetCallback,
	CharacteristicSetCallback,
	CharacteristicValue,
} from 'homebridge';

import path from 'path';

const heatingCoolingStates = ['OFF', 'HEATING', 'COOLING', 'AUTO'];
const temperatureDisplayUnits = ['C°', 'F°'];

export default class Thermostat implements AccessoryPlugin {
	private readonly service: Service;

	private readonly Characteristic = this.api.hap.Characteristic;

	private readonly manufacturer: string;
	private readonly model: string;

	private readonly storagePath: string;

	private temperatureDisplayUnits?: CharacteristicValue;
	private currentHeatingCoolingState?: CharacteristicValue;
	private targetHeatingCoolingState?: CharacteristicValue;
	private currentTemperature?: CharacteristicValue;
	private targetTemperature?: CharacteristicValue;

	public constructor(
		private readonly logger: Logging,
		private readonly config: AccessoryConfig,
		private readonly api: API
	) {
		this.manufacturer = config.manufacturer || 'DefaultManufacturer';
		this.model = config.model || 'DefaultModel';

		const uuid = api.hap.uuid.generate(config.name);
		this.storagePath = path.join(
			this.api.user.persistPath(),
			`${config.accessory}.${uuid}.json`
		);

		this.loadState();

		this.service = new this.api.hap.Service.Thermostat(this.config.name);
		this.logger.debug('Finished initializing accessory:', this.config.name);

		this.api.on('shutdown', () => {
			this.saveState();
			this.logger.debug('State persisted.');
		});
	}

	private loadState(): void {
		let rawFile = '{}';
		if (existsSync(this.storagePath)) {
			rawFile = readFileSync(this.storagePath, 'utf8');
		}

		const stored = JSON.parse(rawFile);

		this.currentHeatingCoolingState = stored.currentHeatingCoolingState || 0;
		this.targetHeatingCoolingState = stored.targetHeatingCoolingState || 0;
		this.currentTemperature = stored.currentTemperature || 20;
		this.targetTemperature = stored.targetTemperature || 20;
		this.temperatureDisplayUnits =
			stored.temperatureDisplayUnits ||
			this.config.temperatureDisplayUnits ||
			0;
	}

	private saveState(): void {
		writeFileSync(
			this.storagePath,
			JSON.stringify({
				currentHeatingCoolingState: this.currentHeatingCoolingState,
				targetHeatingCoolingState: this.targetHeatingCoolingState,
				currentTemperature: this.currentTemperature,
				targetTemperature: this.targetTemperature,
				temperatureDisplayUnits: this.temperatureDisplayUnits,
			})
		);
	}

	private getCurrentHeatingCoolingState(cb: CharacteristicGetCallback) {
		cb(null, this.currentHeatingCoolingState);
	}

	private getTargetHeatingCoolingState(cb: CharacteristicGetCallback) {
		cb(null, this.targetHeatingCoolingState);
	}

	private setTargetHeatingCoolingState(
		value: CharacteristicValue,
		cb: CharacteristicSetCallback
	) {
		this.targetHeatingCoolingState = value;
		if (value < 3) {
			this.currentHeatingCoolingState = value;
		}

		this.logger.debug(
			`Set HeatingCoolingState to '${heatingCoolingStates[value as number]}'`
		);

		cb();
	}

	private getCurrentTemperature(cb: CharacteristicGetCallback) {
		cb(null, this.currentTemperature);
	}

	private getTargetTemperature(cb: CharacteristicGetCallback) {
		cb(null, this.targetTemperature);
	}

	private setTargetTemperature(
		value: CharacteristicValue,
		cb: CharacteristicSetCallback
	) {
		this.targetTemperature = value;

		this.currentTemperature = value;
		this.service.setCharacteristic(
			this.Characteristic.CurrentTemperature,
			value
		);

		this.logger.debug(`Set Temperature to '${value}'`);
		cb();
	}

	private getTemperatureDisplayUnits(cb: CharacteristicGetCallback) {
		cb(null, this.temperatureDisplayUnits);
	}

	private setTemperatureDisplayUnits(
		value: CharacteristicValue,
		cb: CharacteristicSetCallback
	) {
		this.temperatureDisplayUnits = value;

		this.logger.debug(
			`Set TemperatureDisplayUnits to '${
				temperatureDisplayUnits[value as number]
			}'`
		);

		cb();
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
			.on('get', this.getCurrentHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(this.Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.service
			.getCharacteristic(this.Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));

		this.service
			.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this))
			.on('set', this.setTemperatureDisplayUnits.bind(this));

		this.service
			.getCharacteristic(this.Characteristic.Name)
			.on('get', this.getName.bind(this));

		return [this.getInformationService(), this.service];
	}
}
