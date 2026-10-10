const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const target = `</div>\n)}`
const replacement = `                                    </div>\n                                );\n                            })()}\n                        </div>\n                    </div>\n                )}`;

// wait, if there are multiple `</div>\n)}` in the file... let me be precise.
const preciseTarget = `<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>\n</div>\n)}`;

code = code.replace(preciseTarget, `<Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>\n                                    </div>\n                                );\n                            })()}\n                        </div>\n                    </div>\n                )}`);

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Fixed IIFE in BuilderClient!");
