import { API } from 'homebridge';
import Thermostat from './thermostat';

export = (api: API) => {
	api.registerAccessory(
		'homebridge-dummy-thermostat',
		'Thermostat',
		Thermostat
	);
};
