const fs = require('fs');

let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

code = code.replace(
`    </div>
)}
                        </div>
                    </div>
                )}`,
`    </div>
)}
<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>
                        </div>
                    )}`
);

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Fixed builder syntax!");
