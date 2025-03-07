import {Attachment} from "./attachments/attachment";
import {Deadline} from "./attachments/deadline";
import PearPlugin from "./main";
import {ViewUpdate} from "@codemirror/view";
import * as yaml from 'js-yaml';
import {moment} from "obsidian";
import {indent, PEAR_SCHEMA} from "./util";
import {Error} from "./attachments/error";
import {Notes} from "./attachments/notes";

const DEFAULT: string 		= ' ';
const COMPLETE: string 		= 'x';
const IN_PROGRESS: string 	= '/';
const SCHEDULING: string 	= '<';
const IMPORTANT: string 	= '!';
const STARRED: string 		= '*';
const REVOKED: string 		= '-';
const UNKNOWN: string 		= '?';
const FORWARD: string 		= '>';
const ANY: string 			= '.';

interface Filter {
	status?: string[];
	created?: { from: moment.Moment, to: moment.Moment };
	due?: { from: moment.Moment, to: moment.Moment };
	priority?: { from: number, to: number };
	estimate?: { from: moment.Duration, to: moment.Duration };
	notes?: string;
}

interface TaskData {
	status: string;
	created?: moment.Moment;
	due?: moment.Moment;
	priority?: number;
	estimate?: moment.Duration;
	notes?: string;
}


class Task implements TaskData {

	public hidden: boolean = false;
	public attachments: Attachment[] = [];
	public element: HTMLElement|undefined;

	status: string;
	created?: moment.Moment;
	due?: moment.Moment;
	priority?: number;
	estimate?: moment.Duration;
	notes?: string;

	constructor(public title: string, public rank: number, public children: Task[], yamlProperties: string, public plugin: PearPlugin) {
		this.status = this.getStatus();

		try {
			Object.assign(this, <TaskData>yaml.load(yamlProperties, {schema: PEAR_SCHEMA}));
			if (this.due) new Deadline(this, this.due);
			if (this.notes) new Notes(this, this.notes);
		} catch (e) {
			new Error(this, e);
		}
	}

	static parseTasks(markdown: string, callback: (task: Task) => void, plugin: PearPlugin): Task[] {
		let tasks: Task[] = [];

		const clear = (erase: boolean) => {
			const newlineIndex = markdown.indexOf('\n');
			let result;
			if (newlineIndex == -1) {
				result = markdown;
			} else {
				result = markdown.slice(0, newlineIndex);
			}

			if (erase) {
				if (newlineIndex == -1) {
					markdown = '';
				} else {
					markdown = markdown.slice(newlineIndex + 1);
				}
			}

			return { text: result };
		};

		while (markdown.length > 0) {
			let iterTask = Task.parseTask(clear, callback, plugin);
			if (iterTask) tasks.push(iterTask);
		}
		return tasks;
	}

	static parseTask(clear: (erase: boolean) => {text: string }, callback: (task: Task) => void, plugin: PearPlugin): Task|null {
		let line = clear(true);

		if (line.text.search(/^\s*- \[.] /gm) != -1) {
			let properties = "";
			let children: Task[] = [];
			let nextLine = clear(false);
			while (indent(nextLine.text) > indent(line.text)) {
				if (nextLine.text.search(/^\s*- \[.] /gm) != -1) {
					let child = Task.parseTask(clear, callback, plugin);
					if (child) children.push(child);
				} else {
					properties += nextLine.text.trimStart() + "\n";
					clear(true);
				}
				nextLine = clear(false);
			}
			let result = new Task(line.text.trimStart(), indent(line.text), children, properties, plugin);
			callback(result);
			return result;
		}
		return null;
	}

	update(source: ViewUpdate) {

	}

	attachPreviewResult(element: HTMLElement|null) {
		this.element = element ?? undefined;
	}

	render() {
		if (!this.element) return;
		let properties = false;
		let i = 0;
		this.hidden = this.plugin.settings.hideCompleted && this.matchStatus(COMPLETE, REVOKED);
		while (i < this.element.childNodes.length) {
			if (this.element.childNodes[i].nodeName == 'BR') { properties = true; }
			if (properties && this.element.childNodes[i].nodeName != 'UL') {
				this.element.childNodes[i].remove();
			} else {
				i ++;
			}
		}
		for (const attachment of this.attachments) {
			attachment.render(this.element);
		}
		this.element.toggleClass('pear-hidden', this.hidden)
	}

	/**
	 * Sends a transaction to change the status of the task.
	 * Status refers to the character inside the markdown checkbox; marked with 'x' here: `- [x] `
	 * @param status {string} - The status to check for.
	 * @returns VoidFunction
	 **/
	setStatus(status: string) {
		const editor = this.plugin.app.workspace.activeEditor?.editor;
		editor?.processLines((line, lineText) => {
			return lineText.match(/^\s*- [.] /g) != null ? lineText : null;
		}, (line, lineText) => {
			if (lineText == this.title) return {
				from: {
					line: line,
					ch: lineText.search(/(?<=\s*- \[).] /g)
				},
				text: status,
				to: {
					line: line,
					ch: lineText.search(/(?<=\s*- \[.)] /g)
				}
			};
		}, false);
	}

	/**
	 * Access status of the task.
	 * Status refers to the character inside the markdown checkbox; marked with 'x' here: `- [x] `
	 * @returns {string|null} The string value of the task status. If the status could not be found, returns null.
	 **/
	getStatus(): string {
		const result = this.title.match(/(?<=^\s*- \[).(?=] )/g);
		if (!result) return " ";
		return result[0];
	}

	/**
	 * Determine whether the status of the task is a specific value.
	 * Status refers to the character inside the markdown checkbox; marked with 'x' here: `- [x] `
	 * @param {string[]} status - The status(es) to check for.
	 * @returns {boolean} Whether the status of the task is equal to the status parameter.
	 **/
	matchStatus(...status: string[]) {
		const result = this.title.match(new RegExp(/(?<=^\s*- \[)/gm.source + status.join('|') + /(?=] )/gm.source));
		return result != null;
	}

}

export { DEFAULT, COMPLETE, IN_PROGRESS, SCHEDULING, IMPORTANT, STARRED, REVOKED, UNKNOWN, FORWARD, ANY, Task };
export type { Filter };
