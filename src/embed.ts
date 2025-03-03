import {MarkdownRenderer, moment, setIcon} from "obsidian";
import * as yaml from "js-yaml";
import {PEAR_SCHEMA} from "./util";
import PearPlugin from "./main";
import {Filter, Task} from "./task";

class Embed implements Filter {
	heading: string = 'TODO';
	color: string = 'var(--color-red-rgb)';
	icon: string = 'filter';
	source?: string;
	status?: string[];
	created?: { from: moment.Moment, to: moment.Moment };
	due?: { from: moment.Moment, to: moment.Moment };
	priority?: { from: number, to: number };
	estimate?: { from: moment.Duration, to: moment.Duration };
	notes?: string;
	tasks: Task[];

	constructor(public raw: string, public plugin: PearPlugin) {
		Object.assign(this, yaml.load(raw, {schema: PEAR_SCHEMA}));
	}

	render() {
		let wrapper = document.createElement("div");
		wrapper.addClass('pear-embed', 'callout');
		wrapper.style.setProperty('--callout-color', this.color);
		let title = wrapper.createEl('div');
		title.addClass('callout-title');
		let iconWrapper = title.createEl('div');
		iconWrapper.addClass('callout-icon');
		setIcon(iconWrapper, this.icon);
		title.append(iconWrapper);
		let innerTitle = title.createEl('div');
		innerTitle.addClass('callout-title-inner');
		innerTitle.textContent = this.heading;
		title.append(innerTitle);
		wrapper.append(title);
		let content = wrapper.createEl('div');
		content.addClass('callout-content');
		wrapper.append(content);

		let filepath = this.plugin.app.workspace.activeEditor?.file ?? null;
		if (filepath) {
			MarkdownRenderer.render(this.plugin.app, `![[${this.source}]]`, content, filepath.path, this.plugin);
		}
		return wrapper;
	}

}

export { Embed };
