import {Attachment} from "./attachment";
import {Task} from "../task";

export class Error extends Attachment {

	constructor(parent: Task, public error: any) {
		super(parent);
		this.type = 'error';
	}

	render(task: HTMLElement) {
		super.render(task);

		this.element.innerText = this.error.reason;
		this.element.addEventListener("mouseenter", (event: MouseEvent) => {
			this.element.style.height = 'unset';
			this.element.style.position = 'absolute';
			this.element.innerText = this.error.message;
		});
		this.element.addEventListener("mouseleave", (event: MouseEvent) => {
			this.element.style.height = '';
			this.element.style.position = '';
			this.element.innerText = this.error.reason;
		});
	}
}
