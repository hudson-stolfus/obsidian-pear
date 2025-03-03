import * as yaml from "js-yaml";
import {moment} from "obsidian";

function indent(source: string): number {
	source = source.substring(0, source.search(/\S/g));
	const spaces = source.match(/ /g)?.length ?? 0;
	const tabs = source.match(/\t/g)?.length ?? 0;
	return spaces / 4 + tabs;
}

const TimeStampYamlType = new yaml.Type('!time', {
	kind: 'scalar',
	construct: (data) => moment(data)
});

const DurationYamlType = new yaml.Type('!dur', {
	kind: 'scalar',
	construct: (data) => moment.duration(data)
});

const RangeYamlType = new yaml.Type('!range', {
	kind: 'sequence',
	construct: (data: any[2]) => {
		return { from: data[0], to: data[1] };
	}
});

const PEAR_SCHEMA = yaml.DEFAULT_SCHEMA.extend({ explicit: [DurationYamlType, TimeStampYamlType, RangeYamlType] });

export {indent, PEAR_SCHEMA};
