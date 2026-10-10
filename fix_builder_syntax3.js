const fs = require('fs');

let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

// Replace the current bottom syntax with the correct one
code = code.replace(
`    </div>
)}
<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>
                        </div>
                    )}`,
`    </div>
)}
<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>
                        </div>
                    )}`
);

// Actually, let's just do a clean match and replace
const target = `    </div>\n)}\n<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>\n                        </div>\n                    )}`;
const replacement = `    </div>\n)}\n<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>\n</div>\n)}`;
code = code.replace(target, replacement);

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Fixed builder syntax!");
