import {Attachment} from "./attachment";
import {TFile} from "obsidian";
import {Deadline} from "./deadline";
import PearPlugin from "./main";

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
	public raw: string;
	public line: number;
	public parent: Task|undefined;
	public element: HTMLElement | null;
	public updatePromise: Promise<void>;

	constructor(public id: string, public file: TFile, private plugin: PearPlugin) {
		this.updatePromise = this.update().then(() => {
			if (this.raw == undefined || this.line == undefined) {
				throw new Error(`Failed to initialize task pear-${this.id}: RAW NOT FOUND`);
			}
			if (this.raw.search(/(?<=@)\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g) != -1) {
				new Deadline(this, plugin);
			}
		});
	}

	async update() {
		const data = (await this.file.vault.adapter.read(this.file.path)).split('\n');
		for (let i = 0; i < data.length; i ++) {
			if (data[i].search(new RegExp(`\\^pear-${this.id}`)) != -1) {
				this.line = i;
				this.raw = data[i];
				const indent = this.raw.match(/(?<=^\s*?)(\t| {2})/g)?.length;
				if (indent != undefined){
					for (let j = i - 1; j >= 0; j--) {
						if ((data[j].match(/(?<=^\s*?)(\t| {2})/g)?.length ?? -1) < indent) {
							this.parent = this.plugin.cache[data[j].match(/(?<=\^pear-)[\da-f]{6}$/g)?.[0] ?? "uncached"];
							break;
						}
					}
				}
			}
		}
	}

	attachPreviewResult(element: HTMLElement) {
		this.element = element ?? undefined;
	}

	render() {
		if (this.element) {
			for (const attachment of this.attachments) {
				const result = attachment.render(this.element);
				let appended = false;
				this.element.childNodes.forEach((taskNode) => {
					if (taskNode.nodeName == 'UL') appended = true;
					if (!appended && taskNode.textContent != null && taskNode.textContent.match(result.replaced) != null) {
						taskNode.textContent = taskNode.textContent.replace(result.replaced, '');
						taskNode.after(result.element);
						appended = true;
					}
				});
			}
			if (this.hidden) this.element.addClass('pear-hidden');
			else this.element.removeClass('pear-hidden');
		}
	}

	setStatus(status: string) {
		this.plugin.app.workspace.activeEditor?.editor?.replaceRange(status, { line: this.line, ch: this.raw.search(STATUS_CONTENT)}, { line: this.line, ch: this.raw.search(STATUS_CONTENT) + 1});
		this.update();
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
