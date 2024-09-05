import "reflect-metadata";
import { container } from "./inversify.config";
export function getService<T>(serviceIdentifier: symbol): T {
    // console.log("Service Identifier:", serviceIdentifier);
    // console.log("Is symbol:", typeof serviceIdentifier === 'symbol');
    // //console.log("Container keys:", container.getAll(serviceIdentifier));
    return container.get<T>(serviceIdentifier);
}