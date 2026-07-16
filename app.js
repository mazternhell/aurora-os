const defaults = {
  mission: "Get the Plasma CNC producing saleable products as quickly as possible.",
  priorities: [
    { text: "Rebuild the simple THC controller", done: false },
    { text: "Perform a plasma test cut and record voltage versus height", done: false },
    { text: "Register Aurora ForgeWorks with DTI", done: false }
  ],
  roiTask: "Restore dependable plasma cut quality so production can begin.",
  nextMilestone: "Complete a repeatable saleable test cut.",
  blockers: [
    "Plasma cut quality is not yet dependable",
    "Actual arc-voltage-to-height relationship is not yet measured"
  ],
  recommendation: "Keep the scope narrow: finish the THC, run controlled test cuts, record results, and use the evidence to choose the next adjustment.",
  milestones: [
    { date: "2026-07-16", text: "Aurora OS repository and GitHub access established" },
    { date: "2026-07-16", text: "Executive dashboard selected as the first Aurora OS deliverable" }
  ],
  lastPmoReview: null
};

const key = "aurora-dashboard-v02";
let state = load();

const $ = (selector) => document.querySelector(selector);
const mission = $("#mission");
const priorities = $("#priorities");
const roiTask = $("#roiTask");
const nextMilestone = $("#nextMilestone");
const blockers = $("#blockers");
const recommendation = $("#recommendation");
const milestoneLog = $("#milestoneLog");
const pmoReport = $("#pmoReport");
const agentStatus = $("#agentStatus");

function load() {
  try {
    return { ...structuredClone(defaults), ...JSON.parse(localStorage.getItem(key)) };
  } catch {
    return structuredClone(defaults);
  }
}

function save() {
  localStorage.setItem(key, JSON.stringify(state));
}

function render() {
  mission.textContent = state.mission;
  roiTask.value = state.roiTask;
  nextMilestone.value = state.nextMilestone;
  recommendation.value = state.recommendation;
  renderPriorities();
  renderBlockers();
  renderMilestones();
  renderAgentStatus();
}

function renderPriorities() {
  priorities.innerHTML = "";
  state.priorities.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `priority-item${item.done ? " done" : ""}`;
    row.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="Mark priority complete">
      <input type="text" value="${escapeHtml(item.text)}" aria-label="Priority">
      <button class="icon-button" aria-label="Delete priority">×</button>`;
    const [check, input, remove] = row.children;
    check.addEventListener("change", () => { item.done = check.checked; save(); renderPriorities(); renderAgentStatus(); });
    input.addEventListener("input", () => { item.text = input.value; save(); });
    remove.addEventListener("click", () => { state.priorities.splice(index, 1); save(); renderPriorities(); renderAgentStatus(); });
    priorities.appendChild(row);
  });
}

function renderBlockers() {
  blockers.innerHTML = "";
  state.blockers.forEach((text, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="text" value="${escapeHtml(text)}" aria-label="Blocker"><button class="icon-button" aria-label="Delete blocker">×</button>`;
    li.children[0].addEventListener("input", (event) => { state.blockers[index] = event.target.value; save(); });
    li.children[1].addEventListener("click", () => { state.blockers.splice(index, 1); save(); renderBlockers(); renderAgentStatus(); });
    blockers.appendChild(li);
  });
}

function renderMilestones() {
  milestoneLog.innerHTML = "";
  [...state.milestones].reverse().forEach((item, reverseIndex) => {
    const index = state.milestones.length - 1 - reverseIndex;
    const row = document.createElement("div");
    row.className = "milestone";
    row.innerHTML = `<time>${item.date}</time><input type="text" value="${escapeHtml(item.text)}" aria-label="Milestone"><button class="icon-button" aria-label="Delete milestone">×</button>`;
    row.children[1].addEventListener("input", (event) => { state.milestones[index].text = event.target.value; save(); });
    row.children[2].addEventListener("click", () => { state.milestones.splice(index, 1); save(); renderMilestones(); });
    milestoneLog.appendChild(row);
  });
}

function renderAgentStatus() {
  const active = state.priorities.filter((item) => !item.done && item.text.trim()).length;
  const blockerCount = state.blockers.filter((item) => item.trim()).length;
  agentStatus.className = "status-badge";

  if (blockerCount > 0 || active > 3) {
    agentStatus.textContent = "Attention";
    agentStatus.classList.add("attention");
  } else if (active > 0) {
    agentStatus.textContent = "Focused";
    agentStatus.classList.add("clear");
  } else {
    agentStatus.textContent = "Needs plan";
  }
}

function runPmoReview() {
  const findings = [];
  const missionText = state.mission.trim();
  const activePriorities = state.priorities.filter((item) => !item.done && item.text.trim());
  const completedPriorities = state.priorities.filter((item) => item.done && item.text.trim());
  const activeBlockers = state.blockers.filter((item) => item.trim());
  const roi = state.roiTask.trim();
  const milestone = state.nextMilestone.trim();

  if (!missionText) findings.push("Define one clear mission for today.");
  if (activePriorities.length === 0) findings.push("Choose the single next action that advances the mission.");
  if (activePriorities.length > 3) findings.push(`Reduce ${activePriorities.length} active priorities to the three that matter most.`);
  if (!roi) findings.push("Identify the highest-ROI task before adding more work.");
  if (!milestone) findings.push("Define a measurable next milestone.");
  if (activeBlockers.length > 0) findings.push(`Resolve or assign an action for ${activeBlockers.length} blocker${activeBlockers.length === 1 ? "" : "s"}.`);
  if (completedPriorities.length > 0) findings.push(`Record meaningful results from ${completedPriorities.length} completed priorit${completedPriorities.length === 1 ? "y" : "ies"}, then remove them from the active list.`);

  if (findings.length === 0) {
    findings.push("The dashboard is focused. Execute the first priority and avoid adding scope until the milestone moves.");
  }

  const firstPriority = activePriorities[0]?.text.trim();
  const nextAction = activeBlockers.length
    ? `Clear the most limiting blocker: ${activeBlockers[0]}.`
    : firstPriority
      ? `Execute the first priority: ${firstPriority}.`
      : "Set one concrete priority and begin it.";

  state.recommendation = `${nextAction} Do not add new initiatives until the next milestone is advanced.`;
  state.lastPmoReview = new Date().toISOString();
  recommendation.value = state.recommendation;
  save();

  pmoReport.innerHTML = `<strong>PMO review complete</strong><ul>${findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  pmoReport.classList.add("visible");
  renderAgentStatus();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

mission.addEventListener("input", () => { state.mission = mission.textContent.trim(); save(); });
roiTask.addEventListener("input", () => { state.roiTask = roiTask.value; save(); });
nextMilestone.addEventListener("input", () => { state.nextMilestone = nextMilestone.value; save(); });
recommendation.addEventListener("input", () => { state.recommendation = recommendation.value; save(); });

$("#runPmoBtn").addEventListener("click", runPmoReview);
$("#addPriorityBtn").addEventListener("click", () => {
  if (state.priorities.length >= 5) return alert("Keep the active list focused: maximum five priorities.");
  state.priorities.push({ text: "New priority", done: false }); save(); renderPriorities(); renderAgentStatus();
});
$("#addBlockerBtn").addEventListener("click", () => { state.blockers.push("New blocker"); save(); renderBlockers(); renderAgentStatus(); });
$("#addMilestoneBtn").addEventListener("click", () => {
  state.milestones.push({ date: new Date().toISOString().slice(0, 10), text: "New milestone" }); save(); renderMilestones();
});
$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset the dashboard to its original data?")) return;
  state = structuredClone(defaults); save(); pmoReport.classList.remove("visible"); render();
});

render();