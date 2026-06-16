async function run() {
  const url = "https://script.google.com/macros/s/AKfycbwHzMVppO_Bnx8otna-41JtxP4eKQ-gOtco7ffIpOKDa92rqYEu042ueXg6JvvkpyGT/exec";
  try {
    const remarkRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'addParentRemark',
        parentId: 'NON_EXISTENT_ID',
        remark: 'Test remark',
        userRole: 'Admin',
        actorEmail: 'admin@test.com'
      })
    });
    const remarkJson = await remarkRes.json();
    console.log("Add remark for non-existent response:", JSON.stringify(remarkJson, null, 2));
  } catch (err) {
    console.error("Failed:", err);
  }
}

run();
