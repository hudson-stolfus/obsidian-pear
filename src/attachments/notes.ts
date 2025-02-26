import {Attachment} from "./attachment";
import {Task} from "../task";
import {MarkdownRenderer} from "obsidian";

export class Notes extends Attachment {

	constructor(parent: Task, public content: any) {
		super(parent);
		this.type = 'notes';
	}

	render(task: HTMLElement) {
		super.render(task);

		let filepath = this.plugin.app.workspace.activeEditor?.file ?? null;
		if (filepath) {
			MarkdownRenderer.render(this.plugin.app, this.content, this.element, filepath.path, this.plugin);
		} else {
			this.element.innerText = this.content;
		}
	}
}
