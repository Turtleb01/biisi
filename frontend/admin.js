window.onload = () => {
  document.querySelectorAll("li").forEach(e=>{
    let removebtn = document.createElement("a");
    removebtn.innerText="Poista";
    removebtn.href="#";
    removebtn.onclick=()=>remove(e);
    e.querySelector(".duration").append(" ");
    e.querySelector(".duration").appendChild(removebtn);
  })
}

const remove = async (e) => {
  console.log(e);
  if(!window.confirm("Remove?")) return;;
  let res = await fetch("/remove", {
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "body": `trackId=${e.id}`,
    "method": "POST",
    "credentials": "include"
  });
  if((await res.text())==="Success") {
    e.remove();
    console.log("Removed");
  }
}
