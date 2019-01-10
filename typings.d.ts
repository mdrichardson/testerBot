// Must use this since TypeScript doesn't allow direct json import
declare module "*.json" {
    const value: any;
    export default value;
}