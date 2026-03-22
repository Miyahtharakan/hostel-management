// PAGE NAV
const pageTitles = {
  dashboard: ['Dashboard', 'Welcome back, Admin Kumar'],
  rooms: ['Room Management', 'Rooms in hostel'],
  students: ['Student Management', 'Students list'],
  fees: ['Fees & Payments', 'Payments overview'],
  complaints: ['Complaints & Maintenance', 'Issues']
};

function showPage(page, btn) {

  document.querySelectorAll('.page').forEach(p =>
    p.classList.remove('active')
  );

  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.remove('active')
  );

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  if (btn) btn.classList.add('active');

  const [title, sub] = pageTitles[page];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;

}

function openModal(id){
  const modal = document.getElementById(id);
  if(modal){
    modal.classList.add("open");
  }
}

function closeModal(id){
  const modal = document.getElementById(id);
  if(modal){
    modal.classList.remove("open");
  }
}


// ROOMS
async function loadRooms(){

  const grid = document.getElementById("roomGrid");
  if(!grid) return;

  const res = await fetch("/rooms");
  const rooms = await res.json();

  const emoji = {
    occupied:"🟢",
    vacant:"⚪",
    maintenance:"🔴"
  };

  grid.innerHTML = rooms.map(r=>`
    <div class="room-tile ${r.status}">
      <div class="room-number">${r.number}</div>
      <div class="room-type">${r.type}</div>
      <div class="room-info">${emoji[r.status]} ${r.status}</div>
    </div>
  `).join("");

}


// STUDENTS
async function loadStudents(){

  const tbody = document.getElementById("studentTableBody");
  if(!tbody) return;

  const res = await fetch("/students");
  const students = await res.json();

 tbody.innerHTML = students.map(s => `
 <tr>
  <td>${s.name}</td>
  <td>${s.room}</td>
  <td>${s.course}</td>
  <td>${s.phone}</td>
  <td>${s.fees}</td>
  <td>${s.status}</td>
  <td>
   <button class="btn btn-danger btn-sm"
  onclick="deleteStudent(${s.id})">
  Delete
  </button>
 </td>
</tr>
`).join("");

}

async function loadRoomSummary(){

  const res = await fetch("/room_summary");
  const data = await res.json();

  const table = document.querySelector("#roomTypeTable");
  if(!table) return;

  table.innerHTML = data.map(r=>`
    <tr>
      <td>${r.type}</td>
      <td>${r.total}</td>
      <td>${r.occupied}</td>
      <td><span style="color:var(--accent);font-weight:600">${r.vacant}</span></td>
    </tr>
  `).join("");

}


// VACANT ROOMS
async function loadVacantRooms(){

  const select = document.getElementById("studentRoom");
  if(!select) return;

  const res = await fetch("/vacant_rooms");
  const rooms = await res.json();

  select.innerHTML = '<option>Select room...</option>';

  rooms.forEach(r=>{
    select.innerHTML += `<option value="${r.number}">${r.number}</option>`;
  });

}

async function loadBlockOccupancy(){

 const res = await fetch("/block_occupancy")
 const data = await res.json()

 const container = document.getElementById("blockOccupancy")
 if(!container) return

 container.innerHTML = data.map(b=>{

   const percent = Math.round((b.occupied/b.total)*100)

   return `
   <div class="occ-bar-wrap">
     <div class="occ-bar-top">
       <span class="occ-bar-label">Block ${b.block}</span>
       <span class="occ-bar-pct">${b.occupied}/${b.total} rooms</span>
     </div>
     <div class="occ-bar">
       <div class="occ-bar-fill" style="width:${percent}%"></div>
     </div>
   </div>
   `
 }).join("")

}

// ADD STUDENT
async function addStudent(){

  const name = document.getElementById("studentName").value;
  const room = document.getElementById("studentRoom").value;
  const course = document.getElementById("studentCourse").value;
  const phone = document.getElementById("studentPhone").value;

  if(!name || !room || !course || !phone){
    alert("Please fill all fields");
    return;
  }

  await fetch("/add_student",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      name:name,
      room:room,
      course:course,
      phone:phone
    })
  });

  closeModal("addStudentModal");

  loadStudents();
  loadRooms();
  loadVacantRooms();
}

async function deleteStudent(id){

  if(!confirm("Delete this student?")) return;

  await fetch("/delete_student/"+id,{
    method:"DELETE"
  });

  loadStudents();
  loadRooms();
  loadVacantRooms();
  loadStats();

}
// DASHBOARD
async function loadStats(){

  const res = await fetch("/stats");
  const data = await res.json();

  const r = document.getElementById("totalRooms");
  const s = document.getElementById("totalStudents");

  if(r) r.textContent = data.total_rooms;
  if(s) s.textContent = data.students;

}


async function loadFeeStats(){

  try{

    const res = await fetch("/fee_stats")
    const data = await res.json()

    const collected = document.getElementById("feesCollected")
    const pending = document.getElementById("feesPending")
    const overdue = document.getElementById("feesOverdue")
    const rate = document.getElementById("collectionRate")

    if(collected) collected.innerText = "₹" + data.collected
    if(pending) pending.innerText = "₹" + data.pending
    if(overdue) overdue.innerText = "₹" + data.overdue

    const total =
      (data.collected || 0) +
      (data.pending || 0) +
      (data.overdue || 0)

    let percent = 0

    if(total > 0){
      percent = Math.round((data.collected / total) * 100)
    }

    if(rate) rate.innerText = percent + "%"

  }
  catch(err){
    console.log("Fee stats error:",err)
  }

}

async function loadRecentPayments(){

 const res = await fetch("/recent_payments")
 const payments = await res.json()

 const container = document.getElementById("paymentList")
 if(!container) return

 container.innerHTML = payments.map(p=>`

 <div class="payment-item">

   <div>
     <div class="payment-name">${p.student}</div>
     <div class="payment-room">
       ${p.payment_date || ""}
     </div>
   </div>

   <div style="text-align:right">

     <div class="payment-amount">
       ₹${p.amount}
     </div>

     <div style="font-size:11px;font-weight:600">

       ${

  p.status?.toLowerCase() === "paid"
  ? '<span style="color:green">Paid</span>'
  : p.status?.toLowerCase() === "pending"
  ? '<span style="color:orange">Pending</span>'
  : '<span style="color:red">Overdue</span>'

}

     </div>

   </div>

 </div>

 `).join("")



}

async function addPayment(){

  const student = document.getElementById("paymentStudent").value
  const amount = document.getElementById("paymentAmount").value
  const status = document.getElementById("paymentStatus").value

  await fetch("/add_payment",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        student:student,
        amount:amount,
        status:status
      })
  })

  closeModal("addPaymentModal")

  loadFeeStats()
  loadRecentPayments()

}

async function loadStudentsDropdown(){

  const res = await fetch("/students")
  const students = await res.json()

  const dropdown = document.getElementById("paymentStudent")

  dropdown.innerHTML = "<option>Select student...</option>"

  students.forEach(s => {

    dropdown.innerHTML += `
      <option value="${s.name}">
        ${s.name} — Room ${s.room}
      </option>
    `

  })

}

async function addComplaint(){

  const title = document.getElementById("complaintTitle").value
  const room = document.getElementById("complaintRoom").value
  const description = document.getElementById("complaintDesc").value
  const priority = document.getElementById("complaintPriority").value
  const student = document.getElementById("complaintStudent").value

  if(!title || !room || !description || !priority || !student){
    alert("Please fill all fields")
    return
  }

  await fetch("/add_complaint",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      title:title,
      room:room,
      description:description,
      priority:priority,
      student:student
    })
  })

  closeModal("addComplaintModal")

}
// RUN AFTER PAGE LOAD
document.addEventListener("DOMContentLoaded",()=>{

  loadRooms();
  loadStudents();
  loadVacantRooms();
  loadBlockOccupancy()
  loadStats();
  loadRoomSummary();
  loadStudentsDropdown();
  loadFeeStats();
  loadRecentPayments();
 

});
setInterval(() => {
  loadStudents();
  loadRooms();
}, 5000); // every 5 seconds