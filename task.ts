import {Attachment} from "./attachment";
import {TFile} from "obsidian";
import {Deadline} from "./deadline";
import PearPlugin from "./main";
import {ViewUpdate} from "@codemirror/view";

const DEFAULT: string 		= ' ';
const COMPLETE: string 		= 'x';
const IN_PROGRESS: string 	= '/';
const SCHEDULING: string 	= '<';
const ASSIGNMENT: string 	= 'n';
const IMPORTANT: string 	= '!';
const STARRED: string 		= '*';
const REVOKED: string 		= '-';
const UNKNOWN: string 		= '?';
const FORWARD: string 		= '>';
const LOCATION: string 		= 'l';
const IDEA: string 			= 'I';
const ANY: string 			= '.';

const STATUS_CONTENT = /(?<=^\s*- \[).(?=] )/g;

class Task {

	public hidden: boolean = false;
	public attachments: Attachment[] = [];
	public parent: Task|undefined;
	public element: HTMLElement | null;
	public hash: string;

	constructor(public raw: string, public file: TFile, private plugin: PearPlugin) {
		if (this.raw.search(/(?<=@)\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g) != -1) {
			new Deadline(this, plugin);
		}
	}

	update(source: ViewUpdate) {

	}

	attachPreviewResult(element: HTMLElement) {
		this.element = element ?? undefined;
	}

	render() {
		if (!this.element) return;

		this.hidden = this.plugin.settings.hideCompleted && this.matchStatus(COMPLETE + "|" + REVOKED);
		for (const attachment of this.attachments) {
			attachment.render(this.element);
		}
		if (this.hidden) this.element.addClass('pear-hidden');
		else this.element.removeClass('pear-hidden');
	}

	setStatus(status: string) {
		const editor = this.plugin.app.workspace.activeEditor?.editor;
		editor?.processLines((line, lineText) => {
			return lineText.match(/^\s*- [.] /g) != null ? lineText : null;
		}, (line, lineText) => {
			if (lineText == this.raw) return {
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

	getStatus(): string|null {
		const result = this.raw.match(/(?<=^\s*- \[).(?=] )/g);
		if (!result) return null;
		return result[0];
	}

	matchStatus(status: string) {
		const result = this.raw.match(new RegExp(/(?<=^\s*- \[)/gm.source + status + /(?=] )/gm.source));
		return result != null;
	}
}

export { DEFAULT, COMPLETE, IN_PROGRESS, SCHEDULING, ASSIGNMENT, IMPORTANT, STARRED, REVOKED, UNKNOWN, FORWARD,
	LOCATION, IDEA, ANY, Task };
