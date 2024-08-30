import { Moment } from 'moment';
import {
	App,
	Editor,
	moment,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface PearPluginSettings {
	dateFormat: string;
	floatingDates: boolean;
}

const DEFAULT_SETTINGS: PearPluginSettings = {
	dateFormat: "YYYY-MM-DD HH:mm",
	floatingDates: false
}

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			const tasks = element.findAll('li.task-list-item');
			for (const task of tasks) {
				let dueDate: Moment|null = null;
				let reminder: Moment|null = null;

				const searchAt = task.innerText.search(/(?<!\\)@/g);
				const searchEx = task.innerText.search(/(?<!\\)!/g);
				if (searchAt !== -1) {
					dueDate = moment(task.innerText.substring(searchAt + 1).trim(), this.settings.dateFormat);
					const dateHint = task.createDiv({
						cls: `pear-date${(dueDate < moment()) ? " pear-overdue" : "" }${this.settings.floatingDates ? " pear-floating": ""}`,
						text: dueDate.format(this.settings.dateFormat)
					});
					dateHint.addEventListener("mouseenter", (event) => {
						// @ts-ignore
						event.target.innerText = dueDate?.format("dddd, MMMM Do, YYYY h:mma") ?? "";
					});
					dateHint.addEventListener("mouseleave", (event) => {
						// @ts-ignore
						event.target.innerText = dueDate?.format(this.settings.dateFormat) ?? "";
					});
					task.childNodes.forEach(node => {
						const searchAtNode = node.textContent?.search(/(?<!\\)@/g);
						if (node.nodeType == Node.TEXT_NODE) node.textContent = node.textContent?.substr(0, searchAtNode) ?? "";
					});
					console.log();
					if (!this.settings.floatingDates && task.querySelector('ul') == null) task.append(document.createElement("br"));
					task.append(dateHint);
				}
				if (searchEx !== -1) {
					reminder = moment(task.innerText.substring(searchEx + 1).trim(), this.settings.dateFormat);
					// task.innerText.substring(0, Math.min(searchAt, searchEx))
				}
			}
		});

		this.addCommand({
			id: "insert-todays-date",
			name: "Insert today's date",
			editorCallback: (editor: Editor) => {
				editor.replaceRange(
					moment().format(this.settings.dateFormat),
					editor.getCursor()
				);
			},
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class PearSettingTab extends PluginSettingTab {
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
				.setValue(this.plugin.settings.dateFormat)
				.setPlaceholder("YYYY-MM-DD")
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
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
			)
	}
}
