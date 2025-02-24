import {
	App,
	Editor, EditorPosition, Hotkey, moment,
	Plugin,
	PluginSettingTab,
	Setting, MarkdownView
} from 'obsidian';
import {EditorView} from "@codemirror/view";
import {Moment} from "moment";
import DurationConstructor = moment.unitOfTime.DurationConstructor;

interface PearPluginSettings {
	dateFormat: string;
	simpleDateFormat: string;
	floatingDates: boolean;
	hideCompleted: boolean;
	schedulingEnabled: boolean;
	showPeriod: { period: number, unit: DurationConstructor };
	taskCache: {
		[key: string]: {
			file: string,
			pos: {
				line: number,
				ch: number
			},
			deadline: string
		}
	};
}

const DEFAULT_SETTINGS: PearPluginSettings = {
	dateFormat: "YYYY-MM-DD HH:mm",
	simpleDateFormat: "MM-DD HH:mm",
	floatingDates: false,
	hideCompleted: true,
	schedulingEnabled: true,
	showPeriod: { period: 2, unit: "weeks" },
	taskCache: {}
}

const dateTimeRegex = /@\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g; //(?=.*\^pear-[0-9a-f]{6})

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingTab(this.app, this));

		const getIndent = (str: string): number => {
			const match = str.match(/^\s*/);
			return match ? match[0].length : 0;
		}

		// @ts-ignore
		const checkTask = (type: regexpp|string): regexpp => {
			if (typeof type === "string") return new RegExp(/(?<=\n\s*)- \[/g.source + type + /] /g.source);
			else return new RegExp(/(?<=^\s*)- \[/g.source + type.source + /] /g.source);
		}

		const getTextNodes = (el: HTMLElement): Node[] => {
			const result: Node[] = [];
			let break_out = false;
			el.childNodes.forEach(node => {
				if (node.nodeName == 'UL') break_out = true;
				if (break_out) return;
				if (node.textContent) result.push(node);
			});
			return result;
		}

		const getDate = (source: string): Moment => {
			const dateSearch = source.search(dateTimeRegex);
			if (dateSearch === -1) return moment.invalid();
			if (source.substring(dateSearch + 1).search(/\d{1,2}((:\d{2}[ap]m?)|(:\d{2})|([ap]m?))/g) === -1) return moment(source.substring(dateSearch + 1).trim(), [ this.settings.simpleDateFormat, this.settings.dateFormat ]).set({ hour: 23, minute: 59, second: 59 });
			return moment(source.substring(dateSearch + 1).trim(), [ this.settings.simpleDateFormat, this.settings.dateFormat ]);
		}

		this.registerMarkdownPostProcessor((element, context) => {
			const completedTasks: HTMLElement[] = element.findAll('.pear-hidden');
			if (completedTasks.length !== 0 && this.settings.hideCompleted) {
				element.find('ul.contains-task-list').style.marginBottom = "0";
				let dropdownOpen = false;
				const completedTaskDropdown = element.createEl('ul', 'pear-completed-dropdown');
				completedTaskDropdown.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon pear-dropdown-closed"><path d="m6 9 6 6 6-6"></path></svg> ${completedTasks.length} hidden task${completedTasks.length == 1 ? "" : "s"}`;
				completedTaskDropdown.onclick = (event) => {
					// @ts-ignore
					if (event.target.nodeName === 'INPUT') return;
					dropdownOpen = !dropdownOpen;
					completedTaskDropdown.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon pear-dropdown-${dropdownOpen ? "open" : "closed"}"><path d="m6 9 6 6 6-6"></path></svg> ${completedTasks.length} hidden task${completedTasks.length == 1 ? "" : "s"}`;
					for (const task of completedTasks) {
						if (dropdownOpen) task.removeClass("pear-hidden");
						else task.addClass("pear-hidden");
						completedTaskDropdown.appendChild(task);
					}
				}
				element.appendChild(completedTaskDropdown);
			}
		});

		this.registerEditorExtension(EditorView.updateListener.of((update): boolean => {
			const { state, dispatch } = update.view;
			let completedParentTaskPos:undefined|number;
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);

			for (let i = 1; i <= state.doc.lines; i ++) {
				const line = state.doc.line(i);
				const task_search = line.text.search(checkTask(/./g));
				if (task_search != -1) {
					let generated_id: string;
					do generated_id = Math.floor(Math.random()*(2**24-1)).toString(16).padStart(6, '0');
					while (this.settings.taskCache[generated_id] != undefined);

					let block_cached: undefined|string = undefined;

					for (const cached_block_id of Object.keys(this.settings.taskCache)) {
						const cached_task = this.settings.taskCache[cached_block_id];
						if (cached_task.file == view?.file?.path && cached_task.pos.line == line.number - 1) {
							block_cached = cached_block_id;
						}
					}

					if (view?.file != null && block_cached == undefined) {
						console.log(line.text, getDate(line.text).toISOString());
						this.settings.taskCache[generated_id] = {
							pos: view.editor.offsetToPos(line.from + task_search),
							file: view.file.path,
							deadline: getDate(line.text).toISOString()
						}
						// this.saveSettings();
						block_cached = generated_id;
						if (line.text.search(/\^pear-[0-9a-f]{6}/g) == -1) {
							console.log(`^pear-${block_cached}`);
							// dispatch(state.update({
							// 	changes: {from: line.to, insert: `${line.text.charAt(line.text.length - 1) == ' ' ? '' : ' '}^pear-${block_cached}`, to: line.to}
							// }));
						}
					}

					const task_box = task_search + line.from + 3;
					const task = line.text.substring(task_box - line.from + 3, line.to);
					// Automatic fulfill parent task
					if (i >= 2) {
						const currentIndent = getIndent(line.text);
						const previousIndent = getIndent(state.doc.line(i - 1).text);
						// Child task check
						if (currentIndent > previousIndent) {
							completedParentTaskPos = i - 1;
							if (state.doc.sliceString(task_box, task_box + 1) != 'x') {
								const parentTaskSearch = state.doc.line(completedParentTaskPos).text.search(checkTask(/[^/ <]/g));
								const parentTaskBox = parentTaskSearch + state.doc.line(completedParentTaskPos).from + 3;
								completedParentTaskPos = undefined;
								if (parentTaskSearch != -1) {
									dispatch(state.update({
										changes: {from: parentTaskBox, insert: "/", to: parentTaskBox + 1}
									}));
								}
							}
						// Sibling task check
						} else if (previousIndent == currentIndent && state.doc.sliceString(task_box, task_box + 1) != 'x') {
							if (completedParentTaskPos) {
								const parentTaskSearch = state.doc.line(completedParentTaskPos).text.search(checkTask(/[^/ <]/g));
								const parentTaskBox = parentTaskSearch + state.doc.line(completedParentTaskPos).from + 3;
								if (parentTaskSearch != -1) {
									dispatch(state.update({
										changes: {from: parentTaskBox, insert: "/", to: parentTaskBox + 1}
									}));
								}
							}
							completedParentTaskPos = undefined;
						// End child tasks
						} else if (currentIndent < previousIndent && completedParentTaskPos) {
							const parentTaskSearch = state.doc.line(completedParentTaskPos).text.search(checkTask(/[ *!<n?]/g));
							const parentTaskBox = parentTaskSearch + state.doc.line(completedParentTaskPos).from + 3;
							if (parentTaskSearch != -1) {
								dispatch(state.update({
									changes: {from: parentTaskBox, insert: "x", to: parentTaskBox + 1}
								}));
							}
							completedParentTaskPos = undefined;
						}
					}

					// Automatic scheduling status
					if (this.settings.schedulingEnabled) {
						if (getDate(task).isValid() && state.doc.sliceString(task_box, task_box + 1) == "<") {
							dispatch(state.update({
								changes: {from: task_box, insert: " ", to: task_box + 1}
							}));
						} else if (!getDate(task).isValid() && state.doc.sliceString(task_box, task_box + 1) == " ") {
							dispatch(state.update({
								changes: {from: task_box, insert: "<", to: task_box + 1}
							}));
						}
					}
				}
			}
			return false;
		}));

		this.addCommand({
			id: "mark-task-complete",
			name: "Mark task complete",
			hotkeys: [
				{ key: 'x', modifiers: [ "Alt" ] } as Hotkey
			],
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor("head");
				const line = editor.getLine(cursor.line);
				const task_search = line.search(checkTask(/[x ]] /g));
				if (task_search != -1) {
					const task_box = {
						from: { line: cursor.line, ch: task_search + 3 } as EditorPosition,
						to: { line: cursor.line, ch: task_search + 4 } as EditorPosition
					};
					editor.replaceRange(line.charAt(task_search + 3) == 'x' ? ' ' : 'x', task_box.from, task_box.to);
				}
			},
		});

		this.addCommand({
			id: "mark-task-partially-complete",
			name: "Mark task partially complete",
			hotkeys: [
				{ key: '/', modifiers: [ "Alt" ] } as Hotkey
			],
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor("head");
				const line = editor.getLine(cursor.line);
				const task_search = line.search(checkTask(/[/ ]/g));
				if (task_search != -1) {
					const task_box = {
						from: { line: cursor.line, ch: task_search + 3 } as EditorPosition,
						to: { line: cursor.line, ch: task_search + 4 } as EditorPosition
					};
					editor.replaceRange(line.charAt(task_search + 3) == '/' ? ' ' : '/', task_box.from, task_box.to);
				}
			},
		});

		this.addCommand({
			id: "mark-task-removed",
			name: "Mark task removed",
			hotkeys: [
				{ key: '-', modifiers: [ "Alt" ] } as Hotkey
			],
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor("head");
				const line = editor.getLine(cursor.line);
				const task_search = line.search(checkTask(/[- ]/g));
				if (task_search != -1) {
					const task_box = {
						from: { line: cursor.line, ch: task_search + 3 } as EditorPosition,
						to: { line: cursor.line, ch: task_search + 4 } as EditorPosition
					};
					editor.replaceRange(line.charAt(task_search + 3) == '-' ? ' ' : '-', task_box.from, task_box.to);
				}
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
				.setPlaceholder("YYYY-MM-DD HH:mm")
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Simple Date Format')
			.setDesc('Simpler format for Pear dates, for when typing the year is redundant')
			.addText(text => text
				.setValue(this.plugin.settings.simpleDateFormat)
				.setPlaceholder("MM-DD HH:mm")
				.onChange(async (value) => {
					this.plugin.settings.simpleDateFormat = value;
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
		new Setting(containerEl)
			.setName('Clear Cache')
			.addButton(button => button
				.setWarning()
				.setButtonText("Clear")
				.onClick(async () => {
					this.plugin.settings.taskCache = {};
					await this.plugin.saveSettings();
				})
			)
	}
}
