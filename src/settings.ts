import * as moment from "moment";
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import {App, PluginSettingTab, Setting} from "obsidian";
import PearPlugin from "./main";

const DEFAULT_SETTINGS: PearPluginSettings = {
	dateFormats: [ "YYYY-MM-DD" ],
	timeFormats: [ "HH:MM", "H:MMa" ],
	floatingDates: false,
	hideCompleted: true,
	schedulingEnabled: true,
	showPeriod: { period: 2, unit: "weeks" },
	todoFile: "./TODO.md"
}

interface PearPluginSettings {
	dateFormats: string[];
	timeFormats: string[];
	floatingDates: boolean;
	hideCompleted: boolean;
	schedulingEnabled: boolean;
	showPeriod: { period: number, unit: DurationConstructor };
	todoFile: string;
}

class PearSettingsTab extends PluginSettingTab {
	plugin: PearPlugin;

	constructor(app: App, plugin: PearPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('General format for Pear dates')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormats.join(', '))
				.setPlaceholder("YYYY-MM-DD")
				.onChange(async (value) => {
					this.plugin.settings.dateFormats = value.split(', ');
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Time Format')
			.setDesc('General format for Pear times')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormats.join(', '))
				.setPlaceholder("HH:mm")
				.onChange(async (value) => {
					this.plugin.settings.timeFormats = value.split(', ');
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('TODO File')
			.setDesc('Set to the path of whichever main TODO list.')
			.addText(text => text
				.setValue(this.plugin.settings.todoFile)
				.setPlaceholder("./TODO.md")
				.onChange(async (value) => {
					this.plugin.settings.todoFile = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Floating Dates')
			.setDesc('Dates will appear on the right side of the screen instead of inline for a cleaner look')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.floatingDates)
				.onChange(async (value) => {
					this.plugin.settings.floatingDates = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Hide Completed Tasks')
			.setDesc('Tasks will remain in the note, however not appear in preview')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideCompleted)
				.onChange(async (value) => {
					this.plugin.settings.hideCompleted = value;
					await this.plugin.saveSettings();
				})
			)
		new Setting(containerEl)
			.setName('Scheduling tasks')
			.setDesc('Mark tasks as scheduling when no date is provided')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.schedulingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.schedulingEnabled = value;
					await this.plugin.saveSettings();
				})
			)
		new Setting(containerEl)
			.setName('Scheduling tasks')
			.setDesc('Mark tasks as scheduling when no date is provided')
			.addText(text => text
				.setValue(this.plugin.settings.showPeriod.period.toString())
				.onChange(async (value) => {
					this.plugin.settings.showPeriod.period = Number(value);
					await this.plugin.saveSettings();
				})
			)
			.addDropdown(momentFormat => momentFormat
				.addOption("hours", "Hours")
				.addOption("days", "Days")
				.addOption("weeks", "Weeks")
				.addOption("months", "Months")
				.setValue(this.plugin.settings.showPeriod.unit)
				.onChange(async (value) => {
					this.plugin.settings.showPeriod.unit = value as DurationConstructor;
					await this.plugin.saveSettings();
				})
			)
	}
}

export { PearSettingsTab, DEFAULT_SETTINGS };
export type { PearPluginSettings }
