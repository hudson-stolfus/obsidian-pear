import * as moment from "moment";
import DurationConstructor = moment.unitOfTime.DurationConstructor;

interface PearPluginSettings {
	dateFormats: string[];
	floatingDates: boolean;
	hideCompleted: boolean;
	schedulingEnabled: boolean;
	showPeriod: { period: number, unit: DurationConstructor };
}

export type { PearPluginSettings };
