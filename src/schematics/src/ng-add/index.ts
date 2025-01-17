import {chain, noop, Rule, SchematicContext, Tree} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {
  addModuleImportToRootModule,
  addPackageJsonDependency,
  getProjectFromWorkspace,
  getWorkspace,
  NodeDependency,
  NodeDependencyType
} from 'schematics-utilities';

/** Loads the full version from the given Angular package gracefully. */
function loadPackageVersionGracefully(context: SchematicContext): string | null {
  try {
    context.logger.log('info', `🧟‍ @lou-decleire/google-maps-autocomplete
     is using the following version ${require(`../../package.json`).version}`);
    return require(`../../package.json`).version;
  } catch {
    return null;
  }
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function addPackageJsonDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {

    const ngCoreVersionTag = getPackageVersionFromPackageJson(host, '@angular/core');

    const dependencies: NodeDependency[] = [
      {
        type: NodeDependencyType.Default,
        version: loadPackageVersionGracefully(context) || 'latest',
        name: '@lou-decleire/google-maps-autocomplete'
      },
      {type: NodeDependencyType.Default, version: '^1.0.0-beta.7', name: '@agm/core'},
      {type: NodeDependencyType.Default, version: '^3.37.0', name: '@types/googlemaps'},
      {type: NodeDependencyType.Default, version: ngCoreVersionTag || '^8.1.2', name: '@angular/animations'},
      {type: NodeDependencyType.Default, version: ngCoreVersionTag || '^8.1.2', name: '@angular/forms'}
    ];

    dependencies.forEach(dependency => {
      addPackageJsonDependency(host, dependency);
      context.logger.log('info', `✅️ Added "${dependency.name}" into ${dependency.type}`);
    });

    return host;
  };
}

export function installPackageJsonDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    context.logger.log('info', `🔍 Installing packages...`);

    return host;
  };
}

export function addModuleToImports(options: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    const project = getProjectFromWorkspace(
      workspace,
      // Takes the first project in case it's not provided by CLI
      options.project ? options.project : Object.keys(workspace['projects'])[0]
    );
    const moduleName = 'MatGoogleMapsAutocompleteModule';
    const agmCoreModule = 'AgmCoreModule.forRoot()';

    addModuleImportToRootModule(host, moduleName, '@lou-decleire/google-maps-autocomplete', project);
    addModuleImportToRootModule(host, agmCoreModule, '@agm/core', project);
    context.logger.log('info', `✅️ "${moduleName}" is imported`);

    return host;
  };
}

/** Gets the version of the specified package by looking at the package.json in the given tree. */
export function getPackageVersionFromPackageJson(tree: Tree, name: string): string | null {
  if (!tree.exists('package.json')) {
    return null;
  }

  const packageJson = JSON.parse(tree.read('package.json')!.toString('utf8'));

  if (packageJson.dependencies && packageJson.dependencies[name]) {
    return packageJson.dependencies[name];
  }

  return null;
}

export default function (options: any): Rule {
  return chain([
    options && options.skipPackageJson ? noop() : addPackageJsonDependencies(),
    options && options.skipPackageJson ? noop() : installPackageJsonDependencies(),
    options && options.skipModuleImport ? noop() : addModuleToImports(options),
  ]);
}
