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
  ]
};

const key = "aurora-dashboard-v01";
let state = load();

const $ = (selector) => document.querySelector(selector);
const mission = $("#mission");
const priorities = $("#priorities");
const roiTask = $("#roiTask");
const nextMilestone = $("#nextMilestone");
const blockers = $("#blockers");
const recommendation = $("#recommendation");
const milestoneLog = $("#milestoneLog");

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
    check.addEventListener("change", () => { item.done = check.checked; save(); renderPriorities(); });
    input.addEventListener("input", () => { item.text = input.value; save(); });
    remove.addEventListener("click", () => { state.priorities.splice(index, 1); save(); renderPriorities(); });
    priorities.appendChild(row);
  });
}

function renderBlockers() {
  blockers.innerHTML = "";
  state.blockers.forEach((text, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="text" value="${escapeHtml(text)}" aria-label="Blocker"><button class="icon-button" aria-label="Delete blocker">×</button>`;
    li.children[0].addEventListener("input", (event) => { state.blockers[index] = event.target.value; save(); });
    li.children[1].addEventListener("click", () => { state.blockers.splice(index, 1); save(); renderBlockers(); });
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

mission.addEventListener("input", () => { state.mission = mission.textContent.trim(); save(); });
roiTask.addEventListener("input", () => { state.roiTask = roiTask.value; save(); });
nextMilestone.addEventListener("input", () => { state.nextMilestone = nextMilestone.value; save(); });
recommendation.addEventListener("input", () => { state.recommendation = recommendation.value; save(); });

$("#addPriorityBtn").addEventListener("click", () => {
  if (state.priorities.length >= 5) return alert("Keep the active list focused: maximum five priorities.");
  state.priorities.push({ text: "New priority", done: false }); save(); renderPriorities();
});
$("#addBlockerBtn").addEventListener("click", () => { state.blockers.push("New blocker"); save(); renderBlockers(); });
$("#addMilestoneBtn").addEventListener("click", () => {
  state.milestones.push({ date: new Date().toISOString().slice(0, 10), text: "New milestone" }); save(); renderMilestones();
});
$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset the dashboard to its original data?")) return;
  state = structuredClone(defaults); save(); render();
});

render();