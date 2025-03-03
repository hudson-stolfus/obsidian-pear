import {Task} from "../task";
import PearPlugin from "../main";

export abstract class Attachment {

	protected plugin: PearPlugin;
	public element: HTMLElement;
	public type: string = 'untyped';
	public rendered: boolean = false;

	protected constructor(public parent: Task) {
		this.parent.attachments.push(this);
		this.plugin = parent.plugin;
	}

	render(task: HTMLElement) {
		task.find(`.pear-attachment.pear-${this.type}`)?.remove();
		this.element = task.createDiv({
			cls: ['pear-attachment', `pear-${this.type}`]
		});
		if (this.parent.hidden) this.element.addClass('pear-hidden');
		task.append(this.element);
		this.rendered = true;
	}

}
