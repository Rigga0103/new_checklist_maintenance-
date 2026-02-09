// Type declarations for CSS module imports
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// For side-effect imports like: import './globals.css'
declare module "*.css";
