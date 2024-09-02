import {
	App,
	Editor, EditorPosition, Hotkey, moment,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';
import {EditorView} from "@codemirror/view";
import {Moment} from "moment";
import * as regexpp from "regexpp";

interface PearPluginSettings {
	dateFormat: string;
	simpleDateFormat: string;
	floatingDates: boolean;
	hideCompleted: boolean;
}

const DEFAULT_SETTINGS: PearPluginSettings = {
	dateFormat: "YYYY-MM-DD HH:mm",
	simpleDateFormat: "MM-DD HH:mm",
	floatingDates: false,
	hideCompleted: true,
}

const dateTimeRegex = /@\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g;

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingTab(this.app, this));

		const getIndent = (str: string): number => {
			const match = str.match(/^\s*/);
			return match ? match[0].length : 0;
		}

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
			if (source.substring(dateSearch + 1).search(/@\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)/g) === -1) return moment(source.substring(dateSearch + 1).trim(), [ this.settings.simpleDateFormat, this.settings.dateFormat ]).set({ hour: 23, minute: 59, second: 59 });
			return moment(source.substring(dateSearch + 1).trim(), [ this.settings.simpleDateFormat, this.settings.dateFormat ]);
		}

		this.registerMarkdownPostProcessor((element) => {
			const tasks = element.findAll('li.task-list-item');
			for (const task of tasks) {
				if (this.settings.hideCompleted && ['x', '-'].contains(task.getAttr("data-task") ?? '')) {
					task.addClass("pear-hidden");
				}
				for (const node of getTextNodes(task)) {
					const searchAt = node.textContent?.search(dateTimeRegex);
					if (searchAt !== -1) {
						const dueDate = getDate(node.textContent ?? "");
						const dateHint = task.createDiv({
							cls: `pear-date${(dueDate < moment()) ? " pear-overdue" : ""}${this.settings.floatingDates ? " pear-floating" : ""}`,
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
						node.textContent = node.textContent?.substr(0, searchAt) ?? "";
						// @ts-ignore
						node.after(dateHint);
					}
				}
			}
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

			for (let i = 1; i <= state.doc.lines; i ++) {
				const line = state.doc.line(i);
				const task_search = line.text.search(checkTask(/./g));
				console.log(line.text);
				if (task_search != -1) {
					const task_box = task_search + line.from + 3;
					const task = line.text.substring(task_box - line.from + 3, line.to);

					// Automatic fulfill parent task
					if (i >= 2) {
						const currentIndent = getIndent(line.text);
						const previousIndent = getIndent(state.doc.line(i - 1).text);
						if (currentIndent > previousIndent) {
							completedParentTaskPos = i - 1;
							if (state.doc.sliceString(task_box, task_box + 1) != 'x') {
								const parentTaskSearch = state.doc.line(completedParentTaskPos).text.search(/(?<=\n\s*)- \[[^/ <]] /g);
								const parentTaskBox = parentTaskSearch + state.doc.line(completedParentTaskPos).from + 3;
								completedParentTaskPos = undefined;
								if (parentTaskSearch != -1) {
									dispatch(state.update({
										changes: {from: parentTaskBox, insert: "/", to: parentTaskBox + 1}
									}));
								}
							}
						} else if (previousIndent == currentIndent && state.doc.sliceString(task_box, task_box + 1) != 'x') {
							if (completedParentTaskPos) {
								const parentTaskSearch = state.doc.line(completedParentTaskPos).text.search(checkTask(/[^/ [<]/g));
								const parentTaskBox = parentTaskSearch + state.doc.line(completedParentTaskPos).from + 3;
								if (parentTaskSearch != -1) {
									dispatch(state.update({
										changes: {from: parentTaskBox, insert: "/", to: parentTaskBox + 1}
									}));
								}
							}
							completedParentTaskPos = undefined;
							// TODO: Hanging subtasks
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
					console.log(getDate(task));
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
	}
}
