#!/usr/bin/env node
/**
 * Linear Integration Script
 * Conecta con Linear API para:
 * - Ver issues del cycle actual
 * - Actualizar estados de issues
 * - Verificar integración con GitHub
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs');
const path = require('path');

// Leer .env si existe
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error('❌ LINEAR_API_KEY no está configurado');
  console.error('Ejecuta: export LINEAR_API_KEY=tu_key');
  process.exit(1);
}

const linear = new LinearClient({ apiKey: API_KEY });

async function getCurrentCycleIssues() {
  try {
    console.log('🔍 Buscando issues del cycle actual...\n');

    // Obtener el team (ajusta el nombre según tu Linear)
    const teams = await linear.teams();
    const team = teams.nodes[0]; // Primer team

    console.log(`📋 Team: ${team.name}\n`);

    // Obtener cycle actual
    const cycles = await linear.cycles({ filter: { isActive: { eq: true } } });
    const currentCycle = cycles.nodes[0];

    if (currentCycle) {
      console.log(`🔄 Cycle actual: ${currentCycle.name}\n`);

      // Obtener issues del cycle
      const issues = await linear.issues({
        filter: { cycle: { id: { eq: currentCycle.id } } },
      });

      console.log(`Total issues: ${issues.nodes.length}\n`);

      for (const issue of issues.nodes) {
        const state = await issue.state;
        console.log(`${issue.identifier} - ${issue.title}`);
        console.log(`   Estado: ${state?.name || 'Sin estado'}`);
        console.log(`   URL: ${issue.url}\n`);
      }
    } else {
      console.log('⚠️  No hay cycle activo');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function verifyGitHubIntegration() {
  try {
    console.log('\n🔗 Verificando integración con GitHub...\n');

    const integrations = await linear.integrations();

    const githubIntegration = integrations.nodes.find(
      i => i.service === 'github'
    );

    if (githubIntegration) {
      console.log('✅ GitHub está conectado');
      console.log(`   ID: ${githubIntegration.id}`);
    } else {
      console.log('⚠️  GitHub no está conectado');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function findIssueByIdentifier(identifier) {
  try {
    const issues = await linear.issues({
      filter: { number: { eq: parseInt(identifier.split('-')[1]) } }
    });

    return issues.nodes[0];
  } catch (error) {
    console.error('❌ Error buscando issue:', error.message);
    return null;
  }
}

async function updateIssueState(identifier, stateName) {
  try {
    const issue = await findIssueByIdentifier(identifier);

    if (!issue) {
      console.log(`❌ Issue ${identifier} no encontrado`);
      return;
    }

    const team = await issue.team;
    const states = await linear.workflowStates({
      filter: { team: { id: { eq: team.id } } }
    });

    const state = states.nodes.find(s => s.name.toLowerCase() === stateName.toLowerCase());

    if (!state) {
      console.log(`❌ Estado "${stateName}" no encontrado`);
      console.log('Estados disponibles:', states.nodes.map(s => s.name).join(', '));
      return;
    }

    await linear.updateIssue(issue.id, { stateId: state.id });
    console.log(`✅ ${identifier} → ${state.name}`);
  } catch (error) {
    console.error('❌ Error actualizando issue:', error.message);
  }
}

async function startIssue(identifier) {
  try {
    const issue = await findIssueByIdentifier(identifier);

    if (!issue) {
      console.log(`❌ Issue ${identifier} no encontrado`);
      return;
    }

    // Crear branch
    const branchName = `feature/${identifier}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+$/, '')
      .substring(0, 50)}`;

    const { execSync } = require('child_process');

    try {
      // Asegurar que estamos en develop y actualizado
      execSync('git checkout develop', { stdio: 'inherit' });
      execSync('git pull', { stdio: 'inherit' });

      // Crear nueva branch
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

      console.log(`\n✅ Branch creada: ${branchName}`);

      // Actualizar estado a "In Progress"
      await updateIssueState(identifier, 'In Progress');

      console.log(`\n📝 Trabajando en: ${issue.title}`);
      console.log(`🔗 ${issue.url}\n`);
    } catch (error) {
      console.error('❌ Error al crear branch:', error.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function finishIssue(identifier) {
  try {
    const issue = await findIssueByIdentifier(identifier);

    if (!issue) {
      console.log(`❌ Issue ${identifier} no encontrado`);
      return;
    }

    console.log(`✅ Finalizando ${identifier}: ${issue.title}`);

    // Actualizar estado a "Done"
    await updateIssueState(identifier, 'Done');

    console.log(`\n💡 Siguiente paso:`);
    console.log(`   git push`);
    console.log(`   gh pr create --title "fix(${identifier}): ${issue.title}"`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// CLI
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

(async () => {
  switch (command) {
    case 'list':
      await getCurrentCycleIssues();
      break;
    case 'verify':
      await verifyGitHubIntegration();
      break;
    case 'start':
      if (!arg1) {
        console.log('Uso: node scripts/linear-sync.js start FOR-XX');
        process.exit(1);
      }
      await startIssue(arg1);
      break;
    case 'finish':
      if (!arg1) {
        console.log('Uso: node scripts/linear-sync.js finish FOR-XX');
        process.exit(1);
      }
      await finishIssue(arg1);
      break;
    case 'update':
      if (!arg1 || !arg2) {
        console.log('Uso: node scripts/linear-sync.js update FOR-XX "Done"');
        process.exit(1);
      }
      await updateIssueState(arg1, arg2);
      break;
    default:
      console.log('Comandos disponibles:');
      console.log('  node scripts/linear-sync.js list           - Ver issues del cycle actual');
      console.log('  node scripts/linear-sync.js start FOR-XX   - Crear branch y marcar In Progress');
      console.log('  node scripts/linear-sync.js finish FOR-XX  - Marcar como Done');
      console.log('  node scripts/linear-sync.js update FOR-XX "State" - Actualizar estado');
      console.log('  node scripts/linear-sync.js verify         - Verificar integración GitHub');
  }
})();
